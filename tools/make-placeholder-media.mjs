#!/usr/bin/env node
/**
 * Generates placeholder clips for `assets/media/` so the homepage is testable
 * before the real captures land.
 *
 * The real files are produced by the capture pipeline in the Wardian app repo
 * and copied in at integration time. These stand-ins deliberately look like
 * placeholders: a labelled colour card naming the clip id, never a mock-up of a
 * UI that does not exist.
 *
 * Usage: node tools/make-placeholder-media.mjs [clip-id ...]
 * Requires ffmpeg on PATH.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mediaDir = join(repoRoot, "assets", "media");

/** Clip ids and headings come from the shared media contract. */
const CLIPS = [
  { id: "hero", heading: "The Grid with live terminals" },
  { id: "graph", heading: "Agents that know about each other" },
  { id: "ask-reply", heading: "Handoffs that leave a record" },
  { id: "workflows", heading: "Workflows that branch, loop, and wait" },
  { id: "thought-telemetry", heading: "See what each agent is thinking" },
  { id: "dashboard", heading: "The fleet, not the tab" },
  { id: "markdown-truth", heading: "Everything is a file you can read" },
  { id: "classes", heading: "Roles you define once" },
];

const WIDTH = 1600;
const HEIGHT = 1000;
const DURATION = 8;

/**
 * Escapes a filesystem path for use as an ffmpeg filter option value. The
 * filtergraph parser and the option parser each consume one level of escaping,
 * so a Windows drive colon needs two backslashes to survive both.
 * @param {string} filePath
 * @returns {string}
 */
function escapeFilterPath(filePath) {
  return filePath.replaceAll("\\", "/").replaceAll(":", "\\\\:");
}

/**
 * Picks a monospace font ffmpeg can load. Falls back to ffmpeg's own default
 * when none of the usual platform paths exist.
 * @returns {string | null} an ffmpeg-escaped font path, or null
 */
function findFont() {
  const windowsRoot = process.env.WINDIR ?? process.env.SystemRoot;
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
    "/System/Library/Fonts/Menlo.ttc",
    windowsRoot ? join(windowsRoot, "Fonts", "consola.ttf") : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return escapeFilterPath(candidate);
    }
  }
  return null;
}

const fontFile = findFont();

/**
 * Builds one drawtext filter reading its text from a file, which avoids
 * ffmpeg's nested escaping rules entirely.
 */
function drawText(textPath, { x, y, size, color }) {
  const parts = [
    `drawtext=textfile=${escapeFilterPath(textPath)}`,
    `x=${x}`,
    `y=${y}`,
    `fontsize=${size}`,
    `fontcolor=${color}`,
  ];
  if (fontFile) parts.push(`fontfile=${fontFile}`);
  return parts.join(":");
}

function run(args) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed (${result.status}): ${result.stderr?.slice(-800)}`);
  }
}

function buildClip(clip, scratch) {
  const lines = [
    { text: "WARDIAN", x: 110, y: 110, size: 38, color: "0x6b7a75" },
    { text: clip.id.toUpperCase(), x: 110, y: 190, size: 118, color: "0xececec" },
    { text: clip.heading, x: 110, y: 360, size: 52, color: "0x5fd1c4" },
    { text: "PLACEHOLDER CLIP", x: 110, y: 520, size: 46, color: "0xf2c14e" },
    { text: `real capture pending - assets/media/${clip.id}.mp4`, x: 110, y: 610, size: 32, color: "0x8b9a94" },
    { text: `${WIDTH} x ${HEIGHT}`, x: 110, y: 830, size: 30, color: "0x6b7a75" },
  ];

  const filters = ["drawgrid=w=80:h=80:t=1:color=0x2f6f6a@0.16"];
  lines.forEach((line, index) => {
    const textPath = join(scratch, `${clip.id}-${index}.txt`);
    writeFileSync(textPath, line.text, "utf8");
    filters.push(drawText(textPath, line));
  });

  const poster = join(mediaDir, `${clip.id}.png`);
  run([
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `color=c=0x191919:s=${WIDTH}x${HEIGHT}`,
    "-vf", filters.join(","),
    "-frames:v", "1",
    poster,
  ]);

  // A slow sweep keeps these as genuine video files rather than still frames.
  const sweep = "drawbox=x=-360+t*240:y=0:w=360:h=8:color=0xf2c14e:t=fill";

  run([
    "-hide_banner", "-loglevel", "error", "-y",
    "-loop", "1", "-framerate", "25", "-t", String(DURATION), "-i", poster,
    "-vf", `${sweep},format=yuv420p`,
    "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
    "-movflags", "+faststart",
    join(mediaDir, `${clip.id}.mp4`),
  ]);

  run([
    "-hide_banner", "-loglevel", "error", "-y",
    "-loop", "1", "-framerate", "25", "-t", String(DURATION), "-i", poster,
    "-vf", `${sweep},format=yuv420p`,
    "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-row-mt", "1",
    join(mediaDir, `${clip.id}.webm`),
  ]);
}

const requested = process.argv.slice(2);
const selected = requested.length
  ? CLIPS.filter((clip) => requested.includes(clip.id))
  : CLIPS;

if (!selected.length) {
  console.error(`No matching clip ids. Known ids: ${CLIPS.map((c) => c.id).join(", ")}`);
  process.exit(1);
}

mkdirSync(mediaDir, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), "wardian-placeholder-"));
try {
  for (const clip of selected) {
    buildClip(clip, scratch);
    console.log(`built ${clip.id}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
