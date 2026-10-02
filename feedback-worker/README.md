# Feedback receiver

The form at `sparkchamber.app/feedback.html` posts here. This Cloudflare Worker checks the Turnstile spam guard, then files the report as an issue in the private `spark-chamber/spark-chamber-feedback` repository. Issues get labels by kind (`kind:wrong-answer` and so on), by source (`from:app` or `from:web`) and by topic (`topic:dividers`). It stores nothing itself, including no IP addresses.

Tests: `npm test` (Node 22 or later; no install needed).

## One-time setup

1. **Cloudflare account:** sign up at dash.cloudflare.com (free plan).
2. **Turnstile widget:** in the dashboard, go to **Turnstile → Add widget**.
   - Name it `sparkchamber.app`, and set the hostname to `sparkchamber.app`.
   - Choose the **Managed** mode.
   - Copy the **site key** and the **secret key**.
3. **GitHub token:** go to github.com → Settings → Developer settings → **Fine-grained tokens → Generate new token**.
   - Resource owner: `spark-chamber`
   - Repository access: only `spark-chamber-feedback`
   - Permissions: **Issues: Read and write** (nothing else)
   - Expiration: up to a year. Put a reminder in your calendar to renew it.
4. **Deploy** from this folder:
   ```
   npx wrangler login
   npx wrangler secret put TURNSTILE_SECRET   # paste the Turnstile secret key
   npx wrangler secret put GITHUB_TOKEN       # paste the GitHub token
   npx wrangler deploy
   ```
   The deploy prints the Worker's address, for example `https://spark-chamber-feedback.<your-subdomain>.workers.dev`.
5. **Connect the form:** in `feedback.html`, replace `[WORKER URL]` with that address and `[TURNSTILE SITE KEY]` with the site key. Then commit.
6. **Test:** send a report from https://sparkchamber.app/feedback.html and check that an issue appears in the feedback repo.

## When the token expires

Create a new token as in step 3, then run `npx wrangler secret put GITHUB_TOKEN` again. Until you do, the form shows "Your report couldn't be saved just now".
