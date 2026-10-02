# Spark Chamber website

Static site for Spark Chamber (plain HTML and CSS, no build step). Hosted on GitHub Pages at https://sparkchamber.app (the `CNAME` file sets the domain).

- `index.html`: home page
- `download.html`: downloads and release notes
- `privacy.html`, `safety.html`, `credits.html`: linked from every footer
- `style.css`: the shared stylesheet. Colors are custom properties at the top. Pages use its classes, with no inline styles.

Bracketed text such as [VERSION] or [KO-FI LINK] is a placeholder to fill in, and links shown as `#` are placeholders too. `TODO.md` lists every one, along with copy that still needs checking against the app.

When you change `style.css`, bump the `?v=` tag in every page's stylesheet link (for example `style.css?v=0.3.0-2`) so browsers load the new version instead of a cached one.
