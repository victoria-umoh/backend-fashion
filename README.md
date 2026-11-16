# Backend Fashion

## Authentication configuration

The backend requires a private `JWT_SECRET` in `.env` to issue login and registration tokens. Use a randomly generated development value, keep `.env` untracked, and restart the backend after changing it.

## Seed local test accounts

Set `SEED_TEST_USERS=true` and the following values in the backend `.env` file before running the seeder:

- `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- `SEED_USER_1_NAME`, `SEED_USER_1_EMAIL`, `SEED_USER_1_PASSWORD`
- `SEED_USER_2_NAME`, `SEED_USER_2_EMAIL`, `SEED_USER_2_PASSWORD`
- `SEED_USER_3_NAME`, `SEED_USER_3_EMAIL`, `SEED_USER_3_PASSWORD`

Then run `npm run seed:users`. This creates one admin and three customer accounts in the configured MongoDB database. Passwords are hashed by the existing user model. Rerunning the script updates a seeded account's password when its `.env` value changes; an existing account with a different role is never changed.

The seeder refuses to run in production. Use only development credentials and a development database. The command does not create, print, or store default passwords.

## Checkout and payments

Order prices are calculated from current product records on the server. Checkout accepts Paystack and cash on delivery only; client-supplied prices and payment results are ignored. Paystack is initialized and verified by the backend, and a signed Paystack webhook handles successful payments if the customer closes the return page. Online orders expire after 30 minutes. Stock is decremented when a COD order is created or after an online charge is verified; if stock is no longer available after payment, the backend requests a refund and reports its status.

The confirmed checkout rules are zero shipping, no free-shipping threshold, and zero tax. For local development these values default to zero. Production must explicitly configure `SHIPPING_FEE=0`, `FREE_SHIPPING_THRESHOLD=0`, and `TAX_PERCENT=0` (or deliberate business rates) rather than relying on defaults.

## Production environment

Set these as deployment environment variables; never commit `.env` or paste secret values into source control:

- `NODE_ENV=production`, `PORT`, `MONGO_URI`
- `JWT_SECRET` (at least 32 characters), optionally `JWT_EXPIRES_IN`
- `FRONTEND_URL` (the frontend's HTTPS origin, without a path); optionally `CORS_ORIGINS` as a comma-separated list of additional exact origins
- `PAYSTACK_SECRET_KEY` (a live `sk_live_...` key; test keys intentionally prevent production startup)
- `SHIPPING_FEE`, `FREE_SHIPPING_THRESHOLD`, `TAX_PERCENT`
- `EMAIL_USER`, `EMAIL_PASS`; optionally `EMAIL_SERVICE` (defaults to Gmail), or `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `EMAIL_FROM`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

For local development, the ignored `.env` is configured for `http://localhost:3000`, port `5001`, and the agreed zero checkout rates. Add a Paystack **test secret key** as `PAYSTACK_SECRET_KEY` to test online checkout; add `EMAIL_USER` and a Gmail app password as `EMAIL_PASS` to test email flows; add the three Cloudinary values to enable admin image uploads. Do not use a live Paystack key locally or commit these values. Until supplied, payment/email/upload operations that need the missing credentials cannot run.

In the Paystack dashboard, configure the webhook URL as `https://<backend-origin>/api/payments/webhook`. Keep the Paystack secret private; the webhook verifies its HMAC signature and then independently verifies each transaction with Paystack.

Email verification is enforced in production. Registration, verification, forgot-password, and reset-password flows require a working email provider. Password reset links are single-use, expire after one hour, and invalidate existing JWTs. Verification links expire after 24 hours.

Order confirmations are sent asynchronously after COD placement or verified Paystack payment. Failed deliveries are logged and recorded on the order; delivery notifications are also sent when an admin marks an order delivered.

Deploy the backend behind HTTPS, use a managed MongoDB replica set with authentication and network restrictions (production startup requires transaction support), and restrict Cloudinary credentials to the required account. Before opening traffic, test an end-to-end live-mode checkout with a low-value item, confirm webhook delivery and refunds, verify email delivery/reset flows, and verify that the frontend's exact HTTPS origin is in `FRONTEND_URL` or `CORS_ORIGINS`.

## Verification and operations

Run backend unit tests with `npm test`. Before deployment, also run the frontend tests and production build. Authentication and payment rate limits use an in-memory store; configure a shared rate-limit store before running multiple backend replicas. Configure automated database backups and perform a restore test, monitor API/payment errors and webhook retries, rotate secrets through the deployment platform, and keep a documented incident/refund process. These operational services require deployment-provider setup and are not enabled by this repository.

## Render deployment

The root `render.yaml` defines the API web service from `feature/modern-ecommerce`; connect this backend repository to Render and create a Blueprint from that file. Render supplies the public API origin after the service is created. The Blueprint deliberately leaves the compute plan unspecified so the account owner can review pricing before creating a service.

Use MongoDB Atlas for `MONGO_URI` (a replica set is required in production), migrate the local `fashion` database if its products/users should be retained, and enter all `sync: false` values in Render's secret/environment settings. Set `FRONTEND_URL` to the final Vercel origin. Configure the Paystack webhook as `https://<render-api-origin>/api/payments/webhook`. Do not deploy until the required secrets and database are configured; production startup intentionally fails closed otherwise.
