# TODO before launch

The site's copy was checked against `spark-chamber/electronics-app` at release 0.2.0 (code, content and docs). This lists what is still missing and what has to happen outside this repo before the site is ready.

## Placeholder links (`href="#"`)

| Link | Where | Points to | Blocked on |
|---|---|---|---|
| Open in browser | `index.html` 46, `download.html` 49 | The hosted web app | The web app (in progress in another chat) |
| Get it from the Snap Store | `download.html` 55 | `https://snapcraft.io/spark-chamber` | Registering the name and uploading the first beta (app docs/QUESTIONS.md Q14, docs/RELEASE.md) |
| Support Spark Chamber | `index.html` 216 | The Ko-fi page | Creating the Ko-fi page (app Q19) |
| Support (nav and footer) | `download.html` 31, 121 | The Ko-fi page (or `index.html#support`) | Same |

## Feedback form

- `feedback.html` has two placeholders: `[WORKER URL]` (the form's `action`) and `[TURNSTILE SITE KEY]`. Fill them in after the one-time setup in `feedback-worker/README.md`. Until then the form can't send.
- The app's Report a problem still copies text for GitHub. Next, it should open `https://sparkchamber.app/feedback.html?kind=…&topic=…&problem=…&seed=…&answer=…&expected=…&version=…`. That needs a way to open the browser: the `url_launcher` package, which needs the owner's approval per the app's CLAUDE.md.
- Weekly analysis: a scheduled Claude run that reads new issues in the feedback repo, groups them by topic and problem, reproduces "wrong answer" reports from their seed, and posts a summary.

## Outside this repo

- **Feedback repo stays private.** The site's "Report a problem" links now go to `feedback.html`, and the Worker files reports into the private repo. The app's current Report a problem text still points to the repo; it changes when the app opens the form instead.
- **Price.** The site says "Free during Early Access" (no "forever" promise) because a one-time price at full release is being considered. If a price is decided, update the Support section on `index.html` and the intro on `download.html`.
- **App store listing.** The app's `snap/snapcraft.yaml` lists `website:` as the private `electronics-app` repo. Point it at this site once it is live.

## Keep in step with the app

- Version and date in every footer, the download header and the release notes (now 0.2.0, 2026-10-02). Release notes come from the app's `docs/release-notes/`.
- Home page facts taken from the app: 50 topics; five right in a row to light a topic; reviews after 1, 3, 7, 14 and 30 days; two misses in review lose mastery; 23 design problems; worst-case and datasheet problems in Real components. The two example cards in "Real work" are real problems from the app (`div_design_pair` and `real_worst_divider`).
- Credits lists the only two works the app's topics cite (Kuphaldt's *Lessons in Electric Circuits* and *ModEL*). Add a row if a topic cites a new CC BY source.
- The Privacy page mirrors the app's About page and `docs/PRIVACY.md`. If the planned design assistant (app backlog U14, the user's own LLM) ships, "makes no network requests" must change.

## Later

- Self-host the IBM Plex fonts (SIL OFL) so the site makes no third-party requests. Then update the "This website" paragraph on `privacy.html`.
- Buttons and nav links have no hover state. In the original, the inline styles overrode the `a:hover` rule, and that behavior is kept as-is.
- Bump the "Last updated" date on `privacy.html` whenever it changes.
