import axios from 'axios';
import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import { supportsTransactions } from '../config/db.js';
import { decrementInventory, restoreInventory } from './checkout.service.js';

const paystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
});

export const verifyPaystackTransaction = async (reference) => {
  try {
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: paystackHeaders() }
    );
    if (!data?.status || data.data?.status !== 'success') {
      throw Object.assign(new Error('Payment has not been completed.'), { statusCode: 400 });
    }
    return data.data;
  } catch (error) {
    if (error.statusCode) throw error;
    throw Object.assign(
      new Error(error.response
        ? 'Unable to verify payment with the provider.'
        : 'Payment verification request failed.'),
      { statusCode: 502 }
    );
  }
};

const requestRefund = async (reference) => {
  try {
    const { data } = await axios.post(
      'https://api.paystack.co/refund',
      { transaction: reference },
      { headers: paystackHeaders() }
    );
    return data.status ? 'refund_requested' : 'refund_required';
  } catch {
    return 'refund_required';
  }
};

const processRefund = async (order, reference, message) => {
  const processingCutoff = new Date(Date.now() - 2 * 60 * 1000);
  const refundOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      isPaid: false,
      $or: [
        { 'paymentResult.status': { $in: ['initialized', 'verifying'] } },
        {
          'paymentResult.status': 'refund_processing',
          paymentProcessingAt: { $lt: processingCutoff },
        },
      ],
    },
    {
      $set: {
        'paymentResult.status': 'refund_processing',
        paymentProcessingAt: new Date(),
      },
    },
    { new: true }
  );
  if (!refundOrder) {
    const latestOrder = await Order.findById(order._id);
    if (latestOrder?.isPaid) return { order: latestOrder, refundStatus: null };
    return {
      order: latestOrder || order,
      message,
      refundStatus: latestOrder?.paymentResult.status || 'refund_processing',
    };
  }

  refundOrder.paymentResult.status = await requestRefund(reference);
  refundOrder.paymentResult.update_time = new Date().toISOString();
  refundOrder.paymentProcessingAt = undefined;
  await refundOrder.save();
  return { order: refundOrder, message, refundStatus: refundOrder.paymentResult.status };
};

export const reconcilePaystackPayment = async (order, transaction) => {
  if (order.isPaid) return { order, refundStatus: null, newlyPaid: false };
  if (order.paymentResult.status?.startsWith('refund_')) {
    return { order, refundStatus: order.paymentResult.status };
  }
  if (transaction.status !== 'success') {
    throw Object.assign(new Error('Payment has not been completed.'), { statusCode: 400 });
  }

  const reference = order.paymentResult.id;
  const isTransactionValid = transaction.reference === reference
    && transaction.currency === 'NGN'
    && Number(transaction.amount) === Math.round(order.totalPrice * 100)
    && transaction.customer?.email?.toLowerCase() === order.paymentResult.email_address?.toLowerCase()
    && transaction.metadata?.orderId === order._id.toString();
  if (!isTransactionValid) {
    return processRefund(
      order,
      reference,
      'The payment details did not match this order. A refund was requested.'
    );
  }
  if (order.expiresAt && order.expiresAt <= new Date()) {
    return processRefund(
      order,
      reference,
      'This checkout session expired before payment was confirmed. A refund was requested.'
    );
  }

  const processingCutoff = new Date(Date.now() - 2 * 60 * 1000);
  const claimedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      isPaid: false,
      $or: [
        { 'paymentResult.status': 'initialized' },
        {
          'paymentResult.status': 'verifying',
          paymentProcessingAt: { $lt: processingCutoff },
        },
      ],
    },
    {
      $set: {
        'paymentResult.status': 'verifying',
        paymentProcessingAt: new Date(),
      },
    },
    { new: true }
  );
  if (!claimedOrder) {
    const latestOrder = await Order.findById(order._id);
    if (latestOrder?.isPaid) return { order: latestOrder, refundStatus: null, newlyPaid: false };
    if (latestOrder?.paymentResult.status?.startsWith('refund_')) {
      return { order: latestOrder, refundStatus: latestOrder.paymentResult.status };
    }
    throw Object.assign(new Error('Payment verification is already in progress.'), { statusCode: 409 });
  }

  const markPaid = (targetOrder) => {
    targetOrder.isPaid = true;
    targetOrder.paidAt = new Date();
    targetOrder.paymentProcessingAt = undefined;
    targetOrder.expiresAt = undefined;
    targetOrder.paymentResult.status = 'success';
    targetOrder.paymentResult.update_time = new Date().toISOString();
    targetOrder.paymentResult.email_address = transaction.customer.email;
  };

  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    let paidOrder;
    try {
      await session.withTransaction(async () => {
        const transactionalOrder = await Order.findById(claimedOrder._id).session(session);
        if (!transactionalOrder || transactionalOrder.isPaid) {
          throw Object.assign(new Error('Payment order changed while being processed.'), { statusCode: 409 });
        }
        await decrementInventory(transactionalOrder.orderItems, session);
        markPaid(transactionalOrder);
        await transactionalOrder.save({ session });
        paidOrder = transactionalOrder;
      });
    } catch (error) {
      if (error.statusCode === 409 && /Stock changed/.test(error.message)) {
        return processRefund(
          claimedOrder,
          reference,
          'Payment succeeded, but the items are no longer available. A refund was requested.'
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }
    return { order: paidOrder, refundStatus: null, newlyPaid: true };
  }

  let reservedStock;
  try {
    reservedStock = await decrementInventory(claimedOrder.orderItems);
  } catch {
    return processRefund(
      claimedOrder,
      reference,
      'Payment succeeded, but the items are no longer available. A refund was requested.'
    );
  }
  markPaid(claimedOrder);
  try {
    await claimedOrder.save();
  } catch (error) {
    await restoreInventory(reservedStock);
    throw error;
  }
  return { order: claimedOrder, refundStatus: null, newlyPaid: true };
};
