import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderTotals,
  normalizeShippingAddress,
} from './checkout.service.js';

test('checkout uses the configured zero shipping and tax rules', () => {
  assert.deepEqual(
    calculateOrderTotals(125.5, 20, {
      shippingFee: 0,
      freeShippingThreshold: 0,
      taxPercent: 0,
    }),
    {
      itemsPrice: 125.5,
      discountAmount: 25.1,
      shippingPrice: 0,
      taxPrice: 0,
      totalPrice: 100.4,
    }
  );
});

test('checkout computes shipping and tax from explicit rules', () => {
  assert.deepEqual(
    calculateOrderTotals(100, 10, {
      shippingFee: 15,
      freeShippingThreshold: 150,
      taxPercent: 5,
    }),
    {
      itemsPrice: 100,
      discountAmount: 10,
      shippingPrice: 15,
      taxPrice: 4.5,
      totalPrice: 109.5,
    }
  );
});

test('checkout rejects an invalid discount instead of returning a success-shaped total', () => {
  assert.throws(
    () => calculateOrderTotals(100, 110, {
      shippingFee: 0,
      freeShippingThreshold: 0,
      taxPercent: 0,
    }),
    /Coupon discount is invalid/
  );
});

test('shipping address fields are trimmed and required', () => {
  assert.deepEqual(
    normalizeShippingAddress({
      address: '  1 Main Street ',
      city: ' Lagos ',
      postalCode: ' 100001 ',
      country: ' Nigeria ',
    }),
    {
      address: '1 Main Street',
      city: 'Lagos',
      postalCode: '100001',
      country: 'Nigeria',
    }
  );
  assert.throws(
    () => normalizeShippingAddress({ address: '', city: 'Lagos', postalCode: '1', country: 'Nigeria' }),
    /valid shipping address/
  );
});
