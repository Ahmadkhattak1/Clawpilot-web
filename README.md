# Clawpilot

This project is a Next.js application using Supabase for waitlist subscribers.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional)
- `NEXT_PUBLIC_BACKEND_API_URL` (default: `http://localhost:4000`)
- `BACKEND_API_URL` (server-side backend URL for API routes)
- `BACKEND_INTERNAL_API_TOKEN` (must match backend `INTERNAL_API_TOKEN`)

Legacy aliases `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` still work.

3. In Supabase SQL Editor, run:

`supabase/schema.sql`

4. Verify waitlist database setup:

```bash
npm run waitlist:check
```

If this command fails with `PGRST205`, your app is pointed at a Supabase project where
`public.subscribers` does not exist yet (or schema cache has not reloaded).

### Auth setup (OTP + callbacks)

To use the email OTP flow in this app:

1. In Supabase Dashboard -> Authentication -> URL Configuration:
   - Set `Site URL` to your app origin (for local: `http://localhost:3000`).
   - Add redirect URL(s), including `/auth/callback` (for local: `http://localhost:3000/auth/callback`).
2. In Supabase Dashboard -> Authentication -> Email Templates:
   - For signup/login templates, include `{{ .Token }}` in the email body.
   - If the template only uses `{{ .ConfirmationURL }}`, users will receive a magic link instead of an OTP code.

5. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment (Vercel)

Set these environment variables in Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional)
- `NEXT_PUBLIC_BACKEND_API_URL`
- `BACKEND_API_URL`
- `BACKEND_INTERNAL_API_TOKEN`

Legacy aliases `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` remain supported.
