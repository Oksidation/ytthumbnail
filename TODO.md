# Thumbly — Setup TODO

Tracks what's left to take the prototype from "code on disk" to "I can generate a thumbnail end-to-end". Order matters.

## Now (required for prototype)

- [ ] **Apply Supabase migrations.** In Supabase Dashboard → SQL Editor → New query, paste each file's contents and run, in order:
  1. `supabase/migrations/0001_init.sql` — tables, RLS, signup trigger, credit functions
  2. `supabase/migrations/0002_storage.sql` — `references` and `thumbnails` storage buckets + policies
- [ ] **Verify `.env.local` has these filled in:**
  - `NEXT_PUBLIC_SITE_URL` (use `http://localhost:3000` for dev)
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`
  - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO`
  - `STRIPE_WEBHOOK_SECRET=whsec_placeholder` (real one wired after deploy)
- [ ] **Run dev server.** `npm run dev` → open http://localhost:3000
- [ ] **Test the flow:**
  1. Sign up via magic link (check inbox; Supabase sends from a noreply address)
  2. On `/dashboard` you should see 3 free credits
  3. Click "New thumbnail" → enter a title → upload a face photo (optional) → Generate
  4. Wait 30–60s for the result page to populate
  5. Hit Download to grab the PNG

## Before going live (deploy)

- [ ] **Push to GitHub:**
  ```bash
  git remote add origin https://github.com/Oksidation/ytthumbnail.git
  git branch -M main
  git add -A
  git commit -m "Initial Thumbly build"
  git push -u origin main
  ```
- [ ] **Deploy on Vercel.** Import the repo → paste every key from `.env.local` into Vercel's env vars (use Production scope, and Preview if you want preview deploys to work) → deploy.
- [ ] **Set the Stripe webhook** at `https://YOUR-DOMAIN/api/stripe/webhook`, subscribe to `checkout.session.completed`, copy the new `whsec_...`, replace `STRIPE_WEBHOOK_SECRET` in Vercel env vars, redeploy.
- [ ] **Update `NEXT_PUBLIC_SITE_URL`** in Vercel to your production URL.
- [ ] **Switch Stripe to Live mode** when ready: re-create the 3 products in Live, update `STRIPE_PRICE_*`, swap `sk_test_` for `sk_live_`, configure a Live webhook.

## After going live (recommended hardening)

- [ ] **Wire Upstash for rate limiting.** Right now the limiter is *disabled* if `UPSTASH_REDIS_REST_URL/TOKEN` are missing — anyone with an account could spam `/api/generate` and burn your OpenAI budget. Sign up at https://console.upstash.com → create a Redis DB → copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel env vars.
- [ ] **Wire Resend for email.** Replace Supabase's default email sender with Resend for branded magic-link emails and Stripe receipts. Sign up at https://resend.com → verify your domain → set `RESEND_API_KEY` → swap Supabase auth email config to your Resend SMTP.
- [ ] **Replace placeholder legal pages.** `/legal/terms`, `/legal/privacy`, `/legal/ai-disclosure` are placeholder copy. Use Termly/iubenda or have a lawyer review before charging real money.
- [ ] **Replace landing-page sample thumbnails.** They're CSS gradients right now. Generate 6–12 real ones with the live model and ship them as static `/public` assets in the SampleGallery component.
- [ ] **Add real OG image** at `app/opengraph-image.tsx` so the link previews look good when shared.
- [ ] **Domain + branding.** Buy a domain, point it at Vercel, decide if "Thumbly" is the name (placeholder).

## Nice-to-haves (defer until paying users exist)

- Post-generation overlay editor (text/logo on top of AI output)
- Bulk download as ZIP from the dashboard
- Generation history search/filter
- Referral / affiliate program
- Subscription tier alongside one-time credit packs
- Public API for power users
