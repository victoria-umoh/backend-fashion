import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import User from './src/models/user.model.js';

dotenv.config();

const accountSpecs = [
  { role: 'admin', nameKey: 'SEED_ADMIN_NAME', emailKey: 'SEED_ADMIN_EMAIL', passwordKey: 'SEED_ADMIN_PASSWORD' },
  ...[1, 2, 3].map((number) => ({
    role: 'user',
    nameKey: `SEED_USER_${number}_NAME`,
    emailKey: `SEED_USER_${number}_EMAIL`,
    passwordKey: `SEED_USER_${number}_PASSWORD`,
  })),
];

const seedUsers = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test accounts cannot be seeded when NODE_ENV is production.');
  }
  if (process.env.SEED_TEST_USERS !== 'true') {
    throw new Error('Set SEED_TEST_USERS=true to explicitly enable development account seeding.');
  }

  const missing = accountSpecs.flatMap(({ nameKey, emailKey, passwordKey }) =>
    [nameKey, emailKey, passwordKey].filter((key) => !process.env[key]?.trim())
  );
  if (missing.length) {
    throw new Error(`Set these variables in the backend .env before seeding: ${missing.join(', ')}`);
  }

  const accounts = accountSpecs.map(({ role, nameKey, emailKey, passwordKey }) => ({
    role,
    name: process.env[nameKey].trim(),
    email: process.env[emailKey].trim().toLowerCase(),
    password: process.env[passwordKey],
  }));
  const invalidAccounts = accounts.filter(({ name, email, password }) =>
    !email.includes('@') || password.length < 6 || !name
  );
  if (invalidAccounts.length) {
    throw new Error('Seed names and emails must be valid, and passwords must contain at least 6 characters.');
  }
  if (new Set(accounts.map(({ email }) => email)).size !== accounts.length) {
    throw new Error('Each seeded account must use a different email address.');
  }

  await connectDB();
  try {
    for (const account of accounts) {
      const existingUser = await User.findOne({ email: account.email });
      if (existingUser) {
        if (existingUser.role !== account.role) {
          throw new Error(`Existing account ${account.email} has a different role; refusing to change it.`);
        }
        const passwordMatches = await existingUser.matchPassword(account.password);
        if (!passwordMatches) {
          existingUser.password = account.password;
          await existingUser.save();
          console.log(`Updated password for ${account.role} account: ${account.email}`);
        } else {
          console.log(`Skipped unchanged ${account.role} account: ${account.email}`);
        }
        continue;
      }

      await User.create(account);
      console.log(`Created ${account.role} account: ${account.email}`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

seedUsers().catch((error) => {
  console.error(`User seeding failed: ${error.message}`);
  process.exitCode = 1;
});
