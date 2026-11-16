import mongoose from 'mongoose';
import Coupon from '../models/coupon.model.js';
import Product from '../models/product.model.js';

const checkoutError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const roundMoney = (amount) => Number((Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2));

const readRate = (key) => {
  const rawValue = process.env[key];
  const value = rawValue === undefined ? 0 : Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    throw checkoutError(`Invalid ${key} configuration.`, 500);
  }
  return value;
};

export const calculateOrderTotals = (subtotal, discountPercent, rules = {}) => {
  const shippingFee = rules.shippingFee ?? readRate('SHIPPING_FEE');
  const freeShippingThreshold = rules.freeShippingThreshold ?? readRate('FREE_SHIPPING_THRESHOLD');
  const taxPercent = rules.taxPercent ?? readRate('TAX_PERCENT');
  if (discountPercent < 0 || discountPercent > 100) {
    throw checkoutError('Coupon discount is invalid.', 400);
  }
  if (taxPercent > 100) throw checkoutError('Invalid TAX_PERCENT configuration.', 500);

  const discountAmount = roundMoney(subtotal * discountPercent / 100);
  const shippingPrice = subtotal >= freeShippingThreshold ? 0 : shippingFee;
  const taxPrice = roundMoney((subtotal - discountAmount) * taxPercent / 100);
  return {
    itemsPrice: roundMoney(subtotal),
    discountAmount,
    shippingPrice: roundMoney(shippingPrice),
    taxPrice,
    totalPrice: roundMoney(subtotal - discountAmount + shippingPrice + taxPrice),
  };
};

export const normalizeShippingAddress = (address) => {
  const fields = ['address', 'city', 'postalCode', 'country'];
  const normalized = {};
  for (const field of fields) {
    const value = address?.[field];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
      throw checkoutError(`A valid shipping ${field} is required.`);
    }
    normalized[field] = value.trim();
  }
  return normalized;
};

export const buildOrderQuote = async ({ orderItems, couponCode }) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0 || orderItems.length > 50) {
    throw checkoutError('Your cart must contain between 1 and 50 items.');
  }

  const requestedItems = orderItems.map((item) => {
    const productId = item?.product || item?._id;
    const qty = Number(item?.qty);
    if (!mongoose.isValidObjectId(productId)) {
      throw checkoutError('A cart item has an invalid product.');
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      throw checkoutError('Item quantities must be whole numbers between 1 and 100.');
    }
    return {
      productId: productId.toString(),
      qty,
      size: typeof item.size === 'string' ? item.size.trim() : '',
      color: typeof item.color === 'string' ? item.color.trim() : '',
    };
  });

  const productIds = [...new Set(requestedItems.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));
  const quantityByProduct = new Map();
  for (const item of requestedItems) {
    quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) || 0) + item.qty);
  }

  for (const [productId, qty] of quantityByProduct) {
    const product = productsById.get(productId);
    if (!product) throw checkoutError('A product in your cart is no longer available.', 404);
    if (product.countInStock < qty) {
      throw checkoutError(`Only ${product.countInStock} units of ${product.name} are available.`, 409);
    }
  }

  const pricedItems = requestedItems.map((item) => {
    const product = productsById.get(item.productId);
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const size = item.size || (sizes.length === 1 ? sizes[0] : '');
    const color = item.color || (colors.length === 1 ? colors[0] : '');

    if (sizes.length && !sizes.includes(size)) {
      throw checkoutError(`Choose an available size for ${product.name}.`);
    }
    if (colors.length && !colors.includes(color)) {
      throw checkoutError(`Choose an available color for ${product.name}.`);
    }

    const regularPrice = Number(product.price);
    const promoPrice = Number(product.promoPrice);
    const price = product.onSale && promoPrice > 0 && promoPrice < regularPrice
      ? promoPrice
      : regularPrice;
    if (!Number.isFinite(price) || price < 0) {
      throw checkoutError(`The price for ${product.name} is invalid.`, 500);
    }

    return {
      name: product.name,
      qty: item.qty,
      image: product.image,
      price,
      size,
      color,
      product: product._id,
    };
  });

  const subtotal = pricedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  let coupon = null;
  if (typeof couponCode === 'string' && couponCode.trim().length > 40) {
    throw checkoutError('Coupon code is too long.');
  }
  const normalizedCouponCode = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : '';
  if (normalizedCouponCode) {
    coupon = await Coupon.findOne({
      name: normalizedCouponCode,
      isActive: true,
      expiry: { $gt: new Date() },
    });
    if (!coupon) throw checkoutError('The coupon is invalid or expired.');
  }

  const discountPercent = coupon ? Number(coupon.discount) : 0;
  const totals = calculateOrderTotals(subtotal, discountPercent);
  return {
    orderItems: pricedItems,
    ...totals,
    couponCode: coupon?.name || '',
    discountPercent,
  };
};

export const decrementInventory = async (orderItems, session) => {
  const quantityByProduct = new Map();
  for (const item of orderItems) {
    const productId = item.product.toString();
    quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + item.qty);
  }

  const decremented = [];
  try {
    for (const [productId, qty] of [...quantityByProduct].sort(([first], [second]) => first.localeCompare(second))) {
      const result = await Product.updateOne(
        { _id: productId, countInStock: { $gte: qty } },
        { $inc: { countInStock: -qty } },
        session ? { session } : undefined
      );
      if (result.modifiedCount !== 1) {
        throw checkoutError('Stock changed while checking out. Please review your cart.', 409);
      }
      decremented.push({ productId, qty });
    }
  } catch (error) {
    if (!session) await restoreInventory(decremented);
    throw error;
  }

  return decremented;
};

export const restoreInventory = async (decrementedItems, session) => {
  for (const { productId, qty } of [...decrementedItems].reverse()) {
    const result = await Product.updateOne(
      { _id: productId },
      { $inc: { countInStock: qty } },
      session ? { session } : undefined
    );
    if (result.modifiedCount !== 1) {
      throw new Error(`Could not restore stock for product ${productId}.`);
    }
  }
};
