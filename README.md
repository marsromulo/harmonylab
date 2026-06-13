This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Wonder payment sandbox

New checkouts use Wonder Payment Link. Stripe support remains only for historical or already-open
Stripe sessions.

Apply `supabase/022_wonder_payments.sql`, then configure these server-side environment variables in
`.env.local` and Vercel:

```text
WONDER_ENVIRONMENT=sandbox
WONDER_APP_ID=<sandbox Open API App ID>
WONDER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
WONDER_WEBHOOK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
NEXT_PUBLIC_SITE_URL=https://your-deployed-domain.example
```

`WONDER_PRIVATE_KEY` is the private key paired with the public key uploaded to Wonder. Never commit
it. `WONDER_WEBHOOK_PUBLIC_KEY` is Wonder's separate webhook verification key shown with the App ID
in the merchant portal.

For local development, the PEM files can instead be referenced without copying their contents:

```text
WONDER_PRIVATE_KEY_PATH=/absolute/path/to/wonder_sandbox_private_key.pem
WONDER_WEBHOOK_PUBLIC_KEY_PATH=/absolute/path/to/wonder_sandbox_webhook_public_key.pem
```

Register this destination in **Open API Credentials > Webhook Destination Record**:

```text
https://your-deployed-domain.example/api/wonder/webhook
```

Link it to the same sandbox App ID. The callback must be public HTTPS, so use a deployed Vercel URL
for end-to-end sandbox testing.

Wonder sandbox card examples:

```text
Visa frictionless:        4440000042200011
Visa 3DS challenge:       4440000009900010
Mastercard frictionless:  5123456789012345
Mastercard 3DS challenge: 5123450000000008
```

Use any future expiry date and the test checkout's requested security-code format. Production card
details do not work in Wonder's sandbox.
