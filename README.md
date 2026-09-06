# Wardian product homepage

This is the static homepage for `https://wardian.org/`. Public documentation is
kept separately at `https://docs.wardian.org/`.

Paths below use placeholders. `<wardian-repo>` is a local clone of
`github.com/wardian-app/Wardian`; this repository is public, so never commit a
real absolute path, drive letter, or user home directory.

## Files

- `index.html` - product homepage: hero, feature sections, widgets, downloads,
  and outbound project links.
- `styles.css` - responsive page styling, light and dark.
- `assets/site.mjs` - homepage behavior: lazy clip loading, the memory
  terminal, and the delivery state diagram. Progressive enhancement only.
- `assets/media/` - the feature clips and their posters. See
  [Feature media](#feature-media).
- `assets/wardian-logo.svg` - real Wardian logo, copied from
  `<wardian-repo>/public/icon.svg`.
- `assets/wardian-screenshot.png` - the Open Graph and Twitter card image. It
  is the hero clip's poster frame, so refreshing the clips refreshes the card:
  copy `<wardian-repo>/docs/assets/site-media/hero.png` over it.
- `assets/wardian-demo.gif` - the previous hero animation, copied from
  `<wardian-repo>/public/demo.gif`. The homepage now uses the `hero` clip
  instead; the file is kept because external pages link to it.
- `assets/download-router.mjs` - browser-side latest-release router for static
  download paths.
- `download/<platform>/index.html` - stable website download paths that redirect
  to the matching asset from the latest GitHub release.
- `tools/make-placeholder-media.mjs` - regenerates placeholder clips.
- `tests/*.test.mjs` - node test-runner checks.
- `favicon.svg` - real Wardian logo favicon.
- `CNAME` - GitHub Pages custom-domain marker for `wardian.org`.
- `.nojekyll` - disables Jekyll processing on GitHub Pages.
- `robots.txt` - basic crawler policy.

## Run locally

No package manager or build step is required.

Serve the directory:

```bash
python3 -m http.server 8080
```

PowerShell:

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080/`.

The `/download/<platform>/` routes should be tested through a local HTTP server
because they load a browser module and redirect to GitHub release assets.

## Tests

```bash
node --test "tests/*.test.mjs"
```

The suite checks the download router, the analytics tag, the feature sections
against the media contract, clip markup (poster, accessible name, both sources,
no eager `src`), internal link resolution, and that no committed file publishes
a drive letter, home directory, or username.

## Feature media

Each feature section carries a short silent clip. The files live in
`assets/media/` as a flat set of `<clip-id>.mp4`, `<clip-id>.webm`, and
`<clip-id>.png`, at 1600x1000.

Required clip ids, in page order:

```text
hero  graph  ask-reply  workflows  thought-telemetry  dashboard
markdown-truth  classes
```

### Where the files come from

The real clips are produced by a scripted Playwright capture in the Wardian app
repository, which writes them and a `manifest.json` to
`<wardian-repo>/docs/assets/site-media/`. Integration copies that directory into
`assets/media/` with the same filenames, flat. Regenerating on a release
replaces the clips without touching the page markup.

Encoding, set by the capture: H.264 mp4 with `-pix_fmt yuv420p` and
`+faststart`, VP9 webm, PNG poster from the first frame, no audio track, 6-12
seconds, and every mp4 under 900 KB.

Clips must contain no real user paths, usernames, drive letters, private
repository names, or real agent sessions.

### Placeholders

Until the capture lands, `assets/media/` holds generated placeholders: labeled
color cards naming the clip id, never a mock-up of a UI that does not exist.
Regenerate them with ffmpeg on `PATH`:

```bash
node tools/make-placeholder-media.mjs            # all clips
node tools/make-placeholder-media.mjs graph      # one clip
```

### How the page loads them

Clips ship with `preload="none"` and no `src`. `assets/site.mjs` attaches the
real sources and plays a clip when an IntersectionObserver reports the section
approaching the viewport, and pauses it on the way out, so the page never
fetches every clip on first paint. Each clip has a visible play control and
each `<video>` is paired with a `<noscript>` poster image, so the page renders
completely with scripting disabled. Under
`prefers-reduced-motion: reduce` nothing autoplays and the poster stands until
the viewer presses play.

## Download paths

The homepage links to stable website download paths:

```text
/download/windows/
/download/macos-apple-silicon/
/download/macos-intel/
/download/linux-deb/
/download/linux-appimage/
```

Each page fetches GitHub's latest release JSON in the browser and redirects to
the matching asset URL. If GitHub's API is unavailable or the expected asset is
missing, the page shows a fallback link to GitHub Releases.

## Deploy with GitHub Pages

1. Push this directory to the repository that should host `wardian.org`.
2. In GitHub, open **Settings > Pages**.
3. Set the source to the branch and folder containing this static site.
4. Set the custom domain to `wardian.org`.
5. Keep `CNAME` committed with exactly `wardian.org`.
6. After DNS resolves and GitHub provisions the certificate, enable
   **Enforce HTTPS**.

Recommended DNS for an apex GitHub Pages site:

```text
wardian.org.  A      185.199.108.153
wardian.org.  A      185.199.109.153
wardian.org.  A      185.199.110.153
wardian.org.  A      185.199.111.153
wardian.org.  AAAA   2606:50c0:8000::153
wardian.org.  AAAA   2606:50c0:8001::153
wardian.org.  AAAA   2606:50c0:8002::153
wardian.org.  AAAA   2606:50c0:8003::153
www           CNAME  wardian-app.github.io.
```

Replace `wardian-app.github.io` if the Pages repository is owned by a different
GitHub account or organization.

## Deploy with Cloudflare Pages

1. Create a Cloudflare Pages project connected to the repository.
2. Use no framework preset.
3. Leave the build command empty.
4. Set the output directory to `/` if the site is at the repository root.
5. Add `wardian.org` as a custom domain in the Pages project.
6. Use Cloudflare's provided DNS target for the Pages project.

Typical Cloudflare DNS records:

```text
wardian.org.  CNAME  <project>.pages.dev.  Proxied
www           CNAME  wardian.org.          Proxied
```

Cloudflare supports CNAME flattening for the apex domain, so the root CNAME is
valid when DNS is hosted on Cloudflare.

## Winget URL validation notes

The homepage exists to provide a stable HTTPS `PublisherUrl` or `PackageUrl`
target for winget package metadata. Keep these points in mind:

- `https://wardian.org/` should return HTTP 200 over HTTPS without requiring
  JavaScript.
- Download paths use JavaScript to resolve the latest GitHub release asset; use
  `https://wardian.org/` itself for the stable PublisherUrl homepage target.
- The page links directly to the GitHub repository, latest release,
  documentation, and support issue tracker.
- Avoid redirects through temporary preview domains for package metadata.
- Do not move the public docs into this site; keep `https://docs.wardian.org/`
  as the documentation URL.
