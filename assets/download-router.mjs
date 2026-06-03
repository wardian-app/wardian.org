export const LATEST_RELEASE_API =
  "https://api.github.com/repos/wardian-app/Wardian/releases/latest";
export const RELEASES_URL = "https://github.com/wardian-app/Wardian/releases/latest";

export const DOWNLOAD_TARGETS = {
  windows: {
    label: "Windows x64",
    assetPattern: /^Wardian_[^/]+_x64-setup\.exe$/i,
  },
  macosApple: {
    label: "macOS Apple Silicon",
    assetPattern: /^Wardian_[^/]+_aarch64\.dmg$/i,
  },
  macosIntel: {
    label: "macOS Intel",
    assetPattern: /^Wardian_[^/]+_x64\.dmg$/i,
  },
  linuxDeb: {
    label: "Linux Debian/Ubuntu x64",
    assetPattern: /^Wardian_[^/]+_amd64\.deb$/i,
  },
  linuxAppImage: {
    label: "Linux AppImage x64",
    assetPattern: /^Wardian_[^/]+_amd64\.AppImage$/i,
  },
};

export function getDownloadTarget(targetId) {
  const target = DOWNLOAD_TARGETS[targetId];

  if (!target) {
    throw new Error(`Unknown download target: ${targetId}`);
  }

  return target;
}

export function findReleaseAsset(release, targetId) {
  const target = getDownloadTarget(targetId);
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const asset = assets.find((candidate) => target.assetPattern.test(candidate.name));

  if (!asset?.browser_download_url) {
    throw new Error(`No ${target.label} asset found in the latest Wardian release.`);
  }

  return asset;
}

async function fetchLatestRelease() {
  const response = await fetch(LATEST_RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed with HTTP ${response.status}.`);
  }

  return response.json();
}

function setStatus(message) {
  const status = document.querySelector("[data-download-status]");

  if (status) {
    status.textContent = message;
  }
}

async function routeDownload() {
  const container = document.querySelector("[data-download-target]");

  if (!container) {
    return;
  }

  const targetId = container.dataset.downloadTarget;
  const target = getDownloadTarget(targetId);

  setStatus(`Finding the latest ${target.label} download...`);

  try {
    const release = await fetchLatestRelease();
    const asset = findReleaseAsset(release, targetId);
    setStatus(`Starting ${asset.name}...`);
    window.location.replace(asset.browser_download_url);
  } catch (error) {
    setStatus(`${error.message} Open GitHub Releases to download manually.`);
    const fallback = document.querySelector("[data-download-fallback]");

    if (fallback) {
      fallback.hidden = false;
    }
  }
}

if (typeof window !== "undefined") {
  routeDownload();
}
