# Wardian product homepage

This is the static homepage for `https://wardian.org/`. Public documentation is
kept separately at `https://docs.wardian.org/`.

## Files

- `index.html` - product homepage, metadata, and outbound project links.
- `styles.css` - responsive page styling.
- `assets/wardian-logo.svg` - real Wardian logo copied from
  `D:/Development/Wardian/public/icon.svg`.
- `assets/wardian-screenshot.png` - real Wardian app screenshot copied from
  `D:/Development/Wardian/docs/assets/screenshots/grid/app-shell.png`.
- `assets/wardian-demo.gif` - current real Wardian demo copied from
  `D:/Development/Wardian/public/demo.gif`.
- `assets/download-router.mjs` - browser-side latest-release router for static
  download paths.
- `download/<platform>/index.html` - stable website download paths that redirect
  to the matching asset from the latest GitHub release.
- `favicon.svg` - real Wardian logo favicon.
- `CNAME` - GitHub Pages custom-domain marker for `wardian.org`.
- `.nojekyll` - disables Jekyll processing on GitHub Pages.
- `robots.txt` - basic crawler policy.

## Run locally

No package manager or build step is required.

Open `index.html` directly in a browser, or serve the directory:

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080/`.

The `/download/<platform>/` routes should be tested through a local HTTP server
because they load a browser module and redirect to GitHub release assets.

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

This repository also includes `.github/workflows/deploy-cloudflare-pages.yml`.
For GitHub Actions deployment, create a Cloudflare Pages project named
`wardian-org`, then add these repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The workflow deploys the repository root as a static site on pushes to `main`.

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
