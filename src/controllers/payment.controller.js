import axios from 'axios';
import asyncHandler from 'express-async-handler';

// Initialize a Paystack transaction server-side so the secret key isn't exposed
export const initializePayment = asyncHandler(async (req, res) => {
  const { email, amount, metadata } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ message: 'email and amount are required' });
  }

  // Paystack expects amount in the smallest currency unit (kobo for NGN)
  const payload = {
    email,
    amount: Math.round(Number(amount)),
    metadata: metadata || {},
  };

  try {
    const { data } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Forward Paystack response to client (contains authorization_url and access_code)
    res.json(data);
  } catch (error) {
    const status = error.response?.status || 500;
    const body = error.response?.data || { message: error.message };
    res.status(status).json(body);
  }
});

export default { initializePayment };
