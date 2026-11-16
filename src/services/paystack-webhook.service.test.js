import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import { verifyPaystackWebhookSignature } from './paystack-webhook.service.js';

test('Paystack webhook signature accepts the expected HMAC', () => {
  const rawBody = Buffer.from('{"event":"charge.success"}');
  const secret = 'local-test-secret';
  const signature = createHmac('sha512', secret).update(rawBody).digest('hex');
  assert.equal(verifyPaystackWebhookSignature(rawBody, signature, secret), true);
});

test('Paystack webhook signature rejects altered payloads and malformed signatures', () => {
  const rawBody = Buffer.from('{"event":"charge.success"}');
  const secret = 'local-test-secret';
  const signature = createHmac('sha512', secret).update(rawBody).digest('hex');
  assert.equal(verifyPaystackWebhookSignature(Buffer.from('altered'), signature, secret), false);
  assert.equal(verifyPaystackWebhookSignature(rawBody, 'not-a-signature', secret), false);
  assert.equal(verifyPaystackWebhookSignature(rawBody, signature, ''), false);
});
