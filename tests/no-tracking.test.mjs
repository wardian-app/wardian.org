import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * The site claims Wardian collects nothing. A tracker on the page that makes
 * that claim would be the single most damaging thing this repository could
 * ship, and it is the kind of thing that returns quietly in a copied-in
 * snippet or an embed. So the claim is enforced rather than trusted.
 *
 * This replaces a test that asserted the Google Analytics tag was present on
 * every page. The tag is gone; the assertion is now its opposite.
 */
const TRACKER_PATTERNS = [
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /\bgtag\s*\(/i,
  /\bdataLayer\b/i,
  /\bG-[A-Z0-9]{8,}\b/,
  /\bUA-\d{4,}-\d+\b/,
  /connect\.facebook\.net/i,
  /\bfbq\s*\(/i,
  /plausible\.io/i,
  /posthog/i,
  /mixpanel/i,
  /segment\.(com|io)/i,
  /amplitude/i,
  /hotjar/i,
  /clarity\.ms/i,
  /sentry/i,
  /matomo/i,
  /cdn\.heapanalytics/i,
];

async function textFiles() {
  const found = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(html|mjs|js|css)$/.test(entry.name)) found.push(full);
    }
  };
  await walk(".");
  return found;
}

const files = await textFiles();

describe("no tracking", () => {
  it("scans a meaningful number of files", () => {
    assert.ok(files.length >= 8, `only found ${files.length} files`);
    assert.ok(files.some((f) => f.endsWith("index.html")));
  });

  for (const file of files) {
    it(`${file} loads no analytics or tracking`, async () => {
      // This file names the trackers it forbids, so it must not scan itself.
      if (file.includes("no-tracking.test")) return;
      const content = await readFile(file, "utf8");
      for (const pattern of TRACKER_PATTERNS) {
        assert.doesNotMatch(content, pattern, `${file} references a tracker (${pattern})`);
      }
    });
  }

  it("sets no cookies and reads no persistent identifier", async () => {
    for (const file of files) {
      if (file.includes("no-tracking.test")) continue;
      const content = await readFile(file, "utf8");
      assert.doesNotMatch(content, /document\.cookie/, `${file} touches cookies`);
    }
  });
});
