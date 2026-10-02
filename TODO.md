# TODO before launch

The site's copy was checked against `spark-chamber/electronics-app` at release 0.2.0 (code, content and docs). This lists what is still missing and what has to happen outside this repo before the site is ready.

## Placeholder links (`href="#"`)

| Link | Where | Points to | Blocked on |
|---|---|---|---|
| Open in browser | `index.html` 40, `download.html` 43 | The hosted web build | Hosting the web build (nothing is public yet) |
| Get it from the Snap Store | `download.html` 49 | `https://snapcraft.io/spark-chamber` | Registering the name and uploading the first beta (app docs/QUESTIONS.md Q14, docs/RELEASE.md) |
| Support Spark Chamber | `index.html` 210 | The Ko-fi page | Creating the Ko-fi page (app Q19) |
| Support (nav and footer) | `download.html` 25, 115 | The Ko-fi page (or `index.html#support`) | Same |

## Bracketed placeholders

| Placeholder | Where | Fill with |
|---|---|---|
| `[KO-FI LINK]` | `index.html` 211 | The Ko-fi URL |

## Outside this repo

- **Feedback repo is private.** "Report a problem" in every footer (except `download.html`) and the Privacy page's "Questions" link go to `github.com/spark-chamber/spark-chamber-feedback`, the URL the app also uses. It returns a 404 for visitors until the repository is made public.
- **Publishing the site.** Merge to `main`, then turn on GitHub Pages (Settings → Pages → deploy from `main`, root folder).
- **Browser claims.** The Browser card says "Works in current Chrome, Firefox, Safari and Edge". Check that once the web build is hosted.
- **App store listing.** The app's `snap/snapcraft.yaml` lists `website:` as the private `electronics-app` repo. Point it at this site once it is live.

## Keep in step with the app

- Version and date in every footer, the download header and the release notes (now 0.2.0, 2026-10-02). Release notes come from the app's `docs/release-notes/`.
- Home page facts taken from the app: 50 topics; five right in a row to light a topic; reviews after 1, 3, 7, 14 and 30 days; two misses in review lose mastery; 23 design problems; worst-case and datasheet problems in Real components. The two example cards in "Real work" are real problems from the app (`div_design_pair` and `real_worst_divider`).
- Credits lists the only two works the app's topics cite (Kuphaldt's *Lessons in Electric Circuits* and *ModEL*). Add a row if a topic cites a new CC BY source.
- The Privacy page mirrors the app's About page and `docs/PRIVACY.md`. If the planned design assistant (app backlog U14, the user's own LLM) ships, "makes no network requests" must change.

## Later

- Self-host the IBM Plex fonts (SIL OFL) so the site makes no third-party requests. Then update the "This website" paragraph on `privacy.html`.
- The subject chips (`index.html` 189–197) show available versus planned only by color. The paragraph below them now says it in words too.
- Buttons and nav links have no hover state. In the original, the inline styles overrode the `a:hover` rule, and that behavior is kept as-is.
- Bump the "Last updated" date on `privacy.html` whenever it changes.
