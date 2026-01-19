import axios from 'axios';
import asyncHandler from 'express-async-handler';

// @desc    Verify Paystack Payment
// @route   GET /api/payments/verify/:reference
// @access  Private
export const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  try {
    const config = {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, // Use SECRET key here
        'Content-Type': 'application/json',
      },
    };

    // 1. Ask Paystack for the status of this transaction
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      config
    );

    // 2. If Paystack says 'success', return the data to frontend
    if (data.status && data.data.status === 'success') {
      res.json(data.data);
    } else {
      res.status(400);
      throw new Error('Payment verification failed');
    }
  } catch (error) {
    res.status(500);
    throw new Error('Internal Server Error during verification');
  }
});