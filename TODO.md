# TODO before launch

Everything on the site that is still a placeholder, plus copy that disagrees with the app (checked against `arcforge-app/electronics-app` at release 0.2.0). The "Known value" column is what the app repo says today. Confirm each one before filling it in.

## Bracketed placeholders

| Placeholder | Where | Known value from the app repo |
|---|---|---|
| `[VERSION]` | Footer of every page; `download.html` header line (33) and release notes (97) | `0.2.0` (pubspec.yaml, metainfo, tag `v0.2.0`) |
| `[RELEASE DATE]` | `download.html` 33, 97 | `2026-10-02` (metainfo `<release>`, docs/release-notes/0.2.0.md) |
| `[WHAT'S NEW 1]`, `[WHAT'S NEW 2]`, `[FIXES]` | `download.html` 99–101 | docs/release-notes/0.2.0.md, "Short form" and "What's new" |
| `[FILE NAME]`, `[FILE SIZE]` | `download.html` 48 (Linux), 55 (macOS), 78 (install command) | Depends on the release format; see "Copy to check" below |
| `[EXACT STEPS FOR THE RELEASE FORMAT]` | `download.html` 76 | Depends on the release format |
| `[EXECUTABLE]` | `download.html` 79 | The Linux binary is `spark-chamber` (app CLAUDE.md) |
| `[MIN MACOS]` | `download.html` 54 | `MACOSX_DEPLOYMENT_TARGET = 12.0` (macOS 12), but macOS is paused |
| `[AVAILABLE REGIONS AND TOPIC COUNT]` | `index.html` 196 | Not settled; the app README says 37 topics in 7 units, which may be out of date |
| `[KO-FI LINK]` | `index.html` 209 | Not created yet (app docs/QUESTIONS.md Q19) |
| `[TITLE]`, `[AUTHOR]`, `[SOURCE LINK]`, `[CC BY X.0, LICENSE LINK]`, `[CHANGES MADE, IF ADAPTED]` | `credits.html` 46–47 | One row per CC BY work used. Delete unused rows. The other allowed CC BY sources are listed in the app's docs/SOURCES.md. |

## Placeholder links (`href="#"`)

| Link | Where | Points to |
|---|---|---|
| Open in browser | `index.html` 40, `download.html` 43 | The hosted web build, if there is one |
| Download for Linux | `download.html` 49 | The Linux release (Snap Store page or file) |
| Download for macOS | `download.html` 56 | The macOS release (paused) |
| Support Spark Chamber | `index.html` 208 | The Ko-fi page |
| Support (nav and footer) | `download.html` 25, 117 | The Ko-fi page (or `index.html#support`) |

## Links that need something done first

- **Report a problem** (footer of every page except `download.html`) and the Privacy page's "Questions" link go to `github.com/arcforge-app/spark-chamber-feedback`. That is the URL the app itself uses, but the repository is **private** right now, so visitors get a 404 until it is made public.

## Copy to check (left unchanged: the brief was to keep the current copy)

- **Real work section** (`index.html` 122–164): work orders are parked in the app (docs/LATER.md, backlog T39) and are not in 0.2.0. The closest shipped feature is the Bench (schematic editor with a multimeter).
- **"Dim" card** (`index.html` 116): "Fading. Charge decays like a capacitor until you review it." In the app, Dim means a topic placed by the knowledge check and not yet confirmed. Mastered topics come back for review on a schedule, and no decay is implemented in `lib/core/mastery.dart`.
- **Linux download** (`download.html` 46–51, 72–80): the app ships as a Snap (`sudo snap install spark-chamber --beta`, app docs/RELEASE.md), not a `.tar.gz`. "Snap Store: coming soon" and the `tar -xzf` steps would need to change.
- **"UBUNTU 24.04+"** (`download.html` 47): the app targets Ubuntu 26, and the Snap uses `core24`.
- **macOS** (`index.html` 41 "Download for Linux or Mac", `download.html` 53–57): macOS is paused (0.2.0 release notes, "Known limits").
- **"Centre"** (`index.html` 47 aria-label, 90 caption): the app uses American English ("center").

## Fixed in this pass

- `download.html` said to back up from "Settings, Export progress". The app's menu item is "Copy progress backup", so that wording now matches the app.

## Later

- Self-host the IBM Plex fonts (SIL OFL) so the site makes no third-party requests. Then update the "This website" paragraph on `privacy.html`.
- If the planned design assistant (app backlog U14, the user's own LLM) ships, the Privacy page's "makes no network requests" must change with it.
- The subject chips (`index.html` 187–195) show available versus coming-later only by color. Once the regions are settled, add the state in text as well.
- Buttons and nav links have no hover state. In the original, the inline styles overrode the `a:hover` rule, and that behavior is kept as-is. Add hover states if wanted.
- Bump the "Last updated" date on `privacy.html` whenever it changes.
