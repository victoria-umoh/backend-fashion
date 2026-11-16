import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';
import sendEmail from '../utils/sendEmail.js';

const requiresEmailVerification = () => (
  process.env.NODE_ENV === 'production' || process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
);

const normalizeEmail = (email) => (
  typeof email === 'string' ? email.trim().toLowerCase() : ''
);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const generateToken = (user) => jwt.sign(
  { id: user._id, tokenVersion: user.tokenVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
);
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const accountResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  token: generateToken(user),
});

const sendAccountEmail = async (user, token, purpose) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const route = purpose === 'verify' ? '/verify-email' : '/reset-password';
  const link = new URL(route, frontendUrl);
  link.searchParams.set('email', user.email);
  link.searchParams.set('token', token);
  const isVerification = purpose === 'verify';
  await sendEmail({
    email: user.email,
    subject: isVerification ? 'Verify your email address' : 'Reset your password',
    message: `
      <p>Hello ${escapeHtml(user.name)},</p>
      <p>${isVerification
        ? 'Confirm your email address to activate your account.'
        : 'Use the link below to choose a new password.'}</p>
      <p><a href="${link.toString()}">${isVerification ? 'Verify email' : 'Reset password'}</a></p>
      <p>This link expires in ${isVerification ? '24 hours' : '1 hour'}.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
};

const createVerificationToken = async (user) => {
  const token = randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  await sendAccountEmail(user, token, 'verify');
};

export const registerUser = asyncHandler(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (!name || name.length > 80 || !isValidEmail(email) || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Enter a name, valid email, and password with at least 6 characters.' });
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const user = await User.create({
    name,
    email,
    password,
    isVerified: !requiresEmailVerification(),
  });
  if (requiresEmailVerification()) {
    try {
      await createVerificationToken(user);
    } catch (error) {
      console.error('Verification email delivery failed:', error.message);
      return res.status(503).json({
        message: 'Your account was created, but the verification email could not be sent. Please request a new email.',
      });
    }
    return res.status(201).json({
      message: 'Check your email for a verification link.',
      verificationRequired: true,
    });
  }

  return res.status(201).json(accountResponse(user));
});

export const authUser = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  const user = await User.findOne({ email });

  if (!user || typeof password !== 'string' || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (requiresEmailVerification() && !user.isVerified) {
    return res.status(403).json({ message: 'Verify your email before signing in.' });
  }
  return res.json(accountResponse(user));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const token = req.body.token;
  if (!isValidEmail(email) || typeof token !== 'string') {
    return res.status(400).json({ message: 'A valid email and verification token are required.' });
  }

  const user = await User.findOne({
    email,
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ message: 'This verification link is invalid or expired.' });

  user.isVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  return res.json({ message: 'Email verified. You can now sign in.' });
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

  const user = await User.findOne({ email });
  if (!user || user.isVerified) {
    return res.json({ message: 'If that account needs verification, a new link has been sent.' });
  }

  try {
    await createVerificationToken(user);
  } catch (error) {
    console.error('Verification email delivery failed:', error.message);
  }
  return res.json({ message: 'If that account needs verification, a new link has been sent.' });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  }

  const token = randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  try {
    await sendAccountEmail(user, token, 'reset');
  } catch (error) {
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    console.error('Password reset email delivery failed:', error.message);
    return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  }
  return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const token = req.body.token;
  const { password } = req.body;
  if (!isValidEmail(email) || typeof token !== 'string' || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Provide a valid reset link and a password with at least 6 characters.' });
  }

  const user = await User.findOne({
    email,
    passwordResetTokenHash: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ message: 'This password reset link is invalid or expired.' });

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  return res.json({ message: 'Password reset. You can now sign in with your new password.' });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
});
