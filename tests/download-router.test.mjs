import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOWNLOAD_TARGETS,
  findReleaseAsset,
  getDownloadTarget,
} from "../assets/download-router.mjs";

const release = {
  tag_name: "v0.4.0",
  assets: [
    {
      name: "Wardian_0.4.0_x64-setup.exe",
      browser_download_url:
        "https://github.com/wardian-app/Wardian/releases/download/v0.4.0/Wardian_0.4.0_x64-setup.exe",
    },
    {
      name: "Wardian_0.4.0_aarch64.dmg",
      browser_download_url:
        "https://github.com/wardian-app/Wardian/releases/download/v0.4.0/Wardian_0.4.0_aarch64.dmg",
    },
    {
      name: "Wardian_0.4.0_x64.dmg",
      browser_download_url:
        "https://github.com/wardian-app/Wardian/releases/download/v0.4.0/Wardian_0.4.0_x64.dmg",
    },
    {
      name: "Wardian_0.4.0_amd64.deb",
      browser_download_url:
        "https://github.com/wardian-app/Wardian/releases/download/v0.4.0/Wardian_0.4.0_amd64.deb",
    },
    {
      name: "Wardian_0.4.0_amd64.AppImage",
      browser_download_url:
        "https://github.com/wardian-app/Wardian/releases/download/v0.4.0/Wardian_0.4.0_amd64.AppImage",
    },
    {
      name: "Wardian_0.4.0_x64.app.tar.gz",
      browser_download_url: "https://example.invalid/updater-only",
    },
  ],
};

describe("download router", () => {
  it("maps stable platform ids to expected release asset names", () => {
    assert.equal(DOWNLOAD_TARGETS.windows.assetPattern.test("Wardian_1.2.3_x64-setup.exe"), true);
    assert.equal(DOWNLOAD_TARGETS.macosApple.assetPattern.test("Wardian_1.2.3_aarch64.dmg"), true);
    assert.equal(DOWNLOAD_TARGETS.macosIntel.assetPattern.test("Wardian_1.2.3_x64.dmg"), true);
    assert.equal(DOWNLOAD_TARGETS.linuxDeb.assetPattern.test("Wardian_1.2.3_amd64.deb"), true);
    assert.equal(DOWNLOAD_TARGETS.linuxAppImage.assetPattern.test("Wardian_1.2.3_amd64.AppImage"), true);
  });

  it("finds the direct browser download URL for a platform", () => {
    const asset = findReleaseAsset(release, "macosApple");

    assert.equal(asset.name, "Wardian_0.4.0_aarch64.dmg");
    assert.equal(asset.browser_download_url.endsWith("Wardian_0.4.0_aarch64.dmg"), true);
  });

  it("does not match updater-only archives for macOS Intel", () => {
    const asset = findReleaseAsset(release, "macosIntel");

    assert.equal(asset.name, "Wardian_0.4.0_x64.dmg");
  });

  it("returns metadata for a known target and rejects unknown targets", () => {
    assert.equal(getDownloadTarget("windows").label, "Windows x64");
    assert.throws(() => getDownloadTarget("plan9"), /Unknown download target/);
  });
});
