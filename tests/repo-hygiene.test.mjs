import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, posix, relative, resolve } from "node:path";
import { describe, it } from "node:test";

const repoRoot = resolve(".");
const SKIP_DIRS = new Set([".git", ".playwright-cli", "node_modules"]);
const TEXT_EXTENSIONS = new Set([
  ".html", ".css", ".mjs", ".js", ".json", ".md", ".svg", ".txt", ".xml", ".yml", ".yaml",
]);
const EXTENSIONLESS_TEXT = new Set(["CNAME", ".nojekyll", ".gitignore"]);

/** @returns {Promise<string[]>} every repo-relative path, POSIX separators. */
async function listFiles(directory = repoRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...(await listFiles(join(directory, entry.name))));
    } else {
      files.push(relative(repoRoot, join(directory, entry.name)).split("\\").join("/"));
    }
  }
  return files;
}

function isTextFile(path) {
  const name = basename(path);
  if (EXTENSIONLESS_TEXT.has(name)) return true;
  const dot = name.lastIndexOf(".");
  return dot > 0 && TEXT_EXTENSIONS.has(name.slice(dot));
}

const allFiles = await listFiles();
const textFiles = allFiles.filter(isTextFile);

describe("repository hygiene", () => {
  // The repository and the site are public, so no path can reveal the machine
  // it was authored on. The needles are assembled from fragments so this file
  // does not trip its own scan.
  const homeSegments = [`/${"Users"}/`, `/${"home"}/`, `\\${"Users"}\\`];
  // A single letter followed by a colon and a separator. The lookbehind keeps
  // "https://" and similar scheme text from matching.
  const driveLetter = /(?<![A-Za-z0-9])[A-Za-z]:[\\/]/;
  const userName = basename(homedir());

  it("scans a meaningful number of text files", () => {
    assert.ok(textFiles.length >= 8, `only found ${textFiles.length} text files`);
    assert.ok(textFiles.includes("README.md"));
    assert.ok(textFiles.includes("index.html"));
  });

  for (const file of textFiles) {
    it(`${file} publishes no local path`, async () => {
      const content = await readFile(file, "utf8");

      assert.doesNotMatch(content, driveLetter, `${file} contains a drive-letter path`);

      for (const segment of homeSegments) {
        assert.ok(!content.includes(segment), `${file} contains a home-directory path (${segment})`);
      }

      if (userName.length >= 3) {
        assert.ok(
          !content.toLowerCase().includes(userName.toLowerCase()),
          `${file} contains the current username`,
        );
      }
    });
  }
});

describe("internal links", () => {
  const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));

  it("finds the homepage and every download route", () => {
    const routes = [
      "download/windows/index.html",
      "download/macos-apple-silicon/index.html",
      "download/macos-intel/index.html",
      "download/linux-deb/index.html",
      "download/linux-appimage/index.html",
    ];
    for (const route of routes) {
      assert.ok(existsSync(route), `missing download route: ${route}`);
    }
    assert.ok(existsSync("index.html"));
    assert.ok(existsSync("assets/download-router.mjs"));
    assert.ok(existsSync("CNAME"));
    assert.ok(existsSync(".nojekyll"));
    assert.ok(existsSync("robots.txt"));
    assert.ok(existsSync("sitemap.xml"));
  });

  for (const file of htmlFiles) {
    it(`${file} links only to files that exist`, async () => {
      const content = await readFile(file, "utf8");
      const references = [...content.matchAll(/(?:href|src|data-src)="([^"]+)"/g)].map((m) => m[1]);

      for (const reference of references) {
        if (/^(?:https?:|mailto:|data:|#)/.test(reference)) continue;

        const withoutHash = reference.split("#")[0];
        if (!withoutHash) continue;

        const target = withoutHash.startsWith("/")
          ? withoutHash.slice(1)
          : posix.join(dirname(file) === "." ? "" : dirname(file), withoutHash);
        const resolved = target === "" || target.endsWith("/") ? `${target}index.html` : target;

        assert.ok(existsSync(resolved), `${file} references a missing file: ${reference}`);
      }
    });
  }

  it("lists the homepage in the sitemap", async () => {
    const sitemap = await readFile("sitemap.xml", "utf8");
    assert.match(sitemap, /<loc>https:\/\/wardian\.org\/<\/loc>/);
  });
});
