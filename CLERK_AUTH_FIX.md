I have analyzed the "Unable to authenticate this browser for your development instance" error, and it indicates a mismatch between your Clerk configuration and your deployment environment. Here's a breakdown of the problem and how to fix it.

### The Problem: Development Keys in a Production Environment

The error message on `memospark.live` is happening because your application is using **Clerk's development keys**, but it's being accessed from a non-development URL.

- **Clerk Development Instances** are designed for local development (e.g., `localhost:3000`) and will not work on your production domain.
- **Clerk Production Instances** are required for your live site (`memospark.live`).

The most likely cause is that the environment variables on your hosting platform (like Vercel, Netlify, AWS, etc.) for the `memospark.live` deployment are set to your development keys instead of your production keys.

### How to Fix It

You will need to update the environment variables in your hosting provider's dashboard. Here are the steps:

1.  **Get Your Production Keys from Clerk:**
    *   Log in to your [Clerk Dashboard](https://dashboard.clerk.com).
    *   Navigate to the correct project for `memospark.live`.
    *   Go to **API Keys** and make sure you are viewing the **Production** keys.
    *   Copy the **Publishable key** and the **Secret key**. The publishable key starts with `pk_live_...` and the secret key starts with `sk_live_...`.

2.  **Update Environment Variables on Your Hosting Provider:**
    *   Log in to your hosting provider's dashboard (e.g., Vercel).
    *   Navigate to your project's settings.
    *   Find the **Environment Variables** section.
    *   Update the following variables with the production keys you copied from Clerk:
        *   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Paste the **Production Publishable Key**.
        *   `CLERK_SECRET_KEY`: Paste the **Production Secret Key**.

3.  **Redeploy Your Application:**
    *   After updating the variables, trigger a new deployment of your `main` branch to ensure the changes take effect.

Once the new deployment is live, the authentication error on `memospark.live` should be resolved.

### Staging / preview: slow or stuck Google / Microsoft sign-up

If OAuth works on production but **hangs or never completes** on a staging or Vercel preview URL, check the following (no app code change required in most cases):

1. **Clerk Dashboard → Domains / authorized origins** — Add the **exact** staging origin (`https://your-staging-host`, or each `*.vercel.app` preview URL if you do not use a fixed staging domain). Preview deployments often get a **new hostname per branch**; if it is not allowed, OAuth can fail or spin.
2. **Vercel → Environment variables** — Confirm `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` match the **same Clerk instance** (Development vs Production) you configured for that deployment target. Mismatched keys and domains cause confusing auth behavior.
3. **Google Cloud Console / Microsoft Entra** — Each OAuth app has **authorized redirect URIs**. Clerk’s dashboard shows the redirect URLs to register; they must match for **your** Clerk Frontend API domain. If only production IdP settings were completed, staging can fail after the user clicks Google or Microsoft.
4. **Browser DevTools** — On a failed attempt, use the **Network** tab (preserve log) and **Console** to see whether requests fail to Clerk, the IdP, or a CAPTCHA/bot-protection script (blocked widgets can look like an infinite load).

### After sign-in / sign-up URLs and onboarding

The app uses middleware that checks Clerk session **`metadata.onboardingComplete`**. In the Clerk Dashboard, set **Paths** (or equivalent) so `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` match your deployment—typically **`/onboarding`** for new users so they land on the wizard before the dashboard. If sign-in sends users straight to `/dashboard` while onboarding is incomplete, they should still be redirected to `/onboarding` by middleware, but matching env URLs avoids extra redirects and confusion.

### Session token (JWT) — same shape in **Development** and **Production** instances

Apply this in **Clerk Dashboard → Configure → Sessions → Customize session token** for **each** Clerk instance you use (dev `*.clerk.accounts.dev` and prod `*.clerk.accounts` / your custom Frontend API). The only difference between environments is **which** instance you edit; the JSON should match so `types/globals.d.ts` and `src/lib/onboarding-gate.ts` stay valid everywhere.

**Do not** leave `app_metadata` / `user_metadata` as empty `{}` unless you also expose onboarding elsewhere. This app expects **`metadata`** (Clerk’s projection of **`publicMetadata`**) so middleware can read `onboardingComplete`.

Use a template like:

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "email": "{{user.primary_email_address}}",
  "metadata": {{user.public_metadata}}
}
```

- **`metadata`: `{{user.public_metadata}}`** — Injects the full public metadata object (including `onboardingComplete`, `name`, `subjects`, etc. set by server actions). Must resolve to a JSON object, not a string.
- Remove redundant empty **`app_metadata`** / **`user_metadata`** keys if you are not using them for Supabase JWT hooks; they are not what `onboarding-gate.ts` reads.

After saving, sign out and sign in (or wait for session refresh) so the new claims appear in `sessionClaims`.

### Tier F: two different `useUser` hooks (naming)

Almost all components import **`useUser` from `@clerk/nextjs`** for the signed-in Clerk user. **`useUserProfilePrefs`** from `@/lib/user-context` is separate: it reads the `UserProvider` context (AI prefs in `memospark_profile` localStorage plus Clerk-derived fields). Do not import `useUser` from `@/lib/user-context` — that name was removed to avoid colliding with Clerk.

### Sunset: `/clerk-onboarding` (done in repo)

There is **no** `/clerk-onboarding` app route and **no** `next.config.js` redirect. Bookmarks to that path: **signed-out** users hit Clerk `auth.protect()` → sign-in; **signed-in** users who still need onboarding are sent to **`/onboarding`** by middleware (the path is not onboarding-allowlisted). **Clerk Dashboard:** ensure after sign-in/up URLs do **not** still point at `/clerk-onboarding`.