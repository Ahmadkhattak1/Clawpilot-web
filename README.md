# Clawpilot

This project is a Next.js application using Supabase for waitlist subscribers.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional)

3. In Supabase SQL Editor, run:

`supabase/schema.sql`

### Auth setup (OTP + callbacks)

To use the email OTP flow in this app:

1. In Supabase Dashboard -> Authentication -> URL Configuration:
   - Set `Site URL` to your app origin (for local: `http://localhost:3000`).
   - Add redirect URL(s), including `/auth/callback` (for local: `http://localhost:3000/auth/callback`).
2. In Supabase Dashboard -> Authentication -> Email Templates:
   - For signup/login templates, include `{{ .Token }}` in the email body.
   - If the template only uses `{{ .ConfirmationURL }}`, users will receive a magic link instead of an OTP code.

4. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment (Vercel)

Set these environment variables in Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional)
