import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const measurementId = "G-SXVJJPBQYF";
const htmlFiles = [
  "index.html",
  "download/windows/index.html",
  "download/macos-apple-silicon/index.html",
  "download/macos-intel/index.html",
  "download/linux-deb/index.html",
  "download/linux-appimage/index.html",
];

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

describe("Google Analytics tag", () => {
  for (const file of htmlFiles) {
    it(`${file} includes the GA4 tag once`, async () => {
      const html = await readFile(file, "utf8");

      assert.equal(
        countMatches(html, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-SXVJJPBQYF/g),
        1,
      );
      assert.equal(countMatches(html, /gtag\('config', 'G-SXVJJPBQYF'\);/g), 1);
      assert.equal(countMatches(html, /window\.dataLayer = window\.dataLayer \|\| \[\];/g), 1);
      assert.equal(html.includes(`id=${measurementId}`), true);
    });
  }
});
