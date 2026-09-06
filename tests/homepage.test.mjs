import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

/**
 * Clip ids and section headings come from the shared media contract. The order
 * is part of the contract, so it is asserted too.
 */
const REQUIRED_CLIPS = [
  { id: "graph", heading: "Agents that know about each other" },
  { id: "ask-reply", heading: "Handoffs that leave a record" },
  { id: "workflows", heading: "Workflows that branch, loop, and wait" },
  { id: "dashboard", heading: "The fleet, not the tab" },
  { id: "markdown-truth", heading: "Everything is a file you can read" },
  { id: "classes", heading: "Roles you define once" },
];

/** The Grid clip sits above the feature sections rather than in one. */
const HERO_CLIP = "hero";

const html = await readFile("index.html", "utf8");

/** Returns every `<section ... data-clip="x">` id in document order. */
function clipSectionsInOrder(source) {
  return [...source.matchAll(/<section\b[^>]*\sdata-clip="([^"]+)"/g)].map((match) => match[1]);
}

/** Returns the markup of every `<video>` element. */
function videoElements(source) {
  return [...source.matchAll(/<video\b[\s\S]*?<\/video>/g)].map((match) => match[0]);
}

describe("feature sections", () => {
  it("has one section per required clip id, in contract order", () => {
    assert.deepEqual(
      clipSectionsInOrder(html),
      REQUIRED_CLIPS.map((clip) => clip.id),
    );
  });

  it("renders the contract heading for each clip", () => {
    for (const clip of REQUIRED_CLIPS) {
      assert.ok(
        html.includes(`>${clip.heading}</h2>`),
        `missing heading for ${clip.id}: ${clip.heading}`,
      );
    }
  });

  it("gives every clip section a docs.wardian.org deep link", () => {
    const sections = [...html.matchAll(/<section\b[^>]*\sdata-clip="([^"]+)"[\s\S]*?<\/section>/g)];

    assert.equal(sections.length, REQUIRED_CLIPS.length);
    for (const [markup, id] of sections.map((match) => [match[0], match[1]])) {
      assert.match(
        markup,
        /href="https:\/\/docs\.wardian\.org\/guide\/[a-z-]+"/,
        `${id} has no docs deep link`,
      );
    }
  });

  it("shows the hero clip above the sections", () => {
    assert.match(html, new RegExp(`data-clip="${HERO_CLIP}"`));
    assert.ok(
      html.indexOf(`data-clip="${HERO_CLIP}"`) < html.indexOf('data-clip="graph"'),
      "the hero clip must precede the first feature section",
    );
  });
});

describe("clip markup", () => {
  const videos = videoElements(html);

  it("has one video per clip id", () => {
    assert.equal(videos.length, REQUIRED_CLIPS.length + 1);
  });

  for (const [index, video] of videos.entries()) {
    it(`video ${index + 1} is lazy, named, and has both sources`, () => {
      const poster = video.match(/poster="([^"]+)"/);
      assert.ok(poster, "video has no poster");
      assert.ok(existsSync(poster[1]), `poster file is missing: ${poster[1]}`);

      const label = video.match(/aria-label="([^"]+)"/);
      assert.ok(label, "video has no accessible name");
      assert.ok(label[1].trim().length > 10, "accessible name is too short to be useful");

      assert.match(video, /\bpreload="none"/, "video must not preload");
      assert.match(video, /\bmuted\b/);
      assert.match(video, /\bloop\b/);
      assert.match(video, /\bplaysinline\b/);

      const webm = video.match(/<source[^>]*data-src="([^"]+\.webm)"[^>]*type="video\/webm"/);
      const mp4 = video.match(/<source[^>]*data-src="([^"]+\.mp4)"[^>]*type="video\/mp4"/);
      assert.ok(webm, "video has no webm source");
      assert.ok(mp4, "video has no mp4 source");
      assert.ok(existsSync(webm[1]), `webm file is missing: ${webm[1]}`);
      assert.ok(existsSync(mp4[1]), `mp4 file is missing: ${mp4[1]}`);

      // Sources are attached by script, so nothing is fetched on first paint.
      assert.doesNotMatch(video, /<source[^>]*\ssrc=/, "sources must not ship a src attribute");
    });
  }

  it("pairs every clip with a noscript poster image", () => {
    const noscriptImages = [...html.matchAll(/<noscript>\s*<img\b[^>]*src="(assets\/media\/[^"]+)"/g)];

    assert.equal(noscriptImages.length, videos.length);
    for (const [, source] of noscriptImages) {
      assert.ok(existsSync(source), `noscript poster is missing: ${source}`);
    }
  });

  it("describes every clip in text, so the section survives blocked media", () => {
    const captions = [...html.matchAll(/<figcaption>([\s\S]*?)<\/figcaption>/g)];

    assert.equal(captions.length, videos.length);
    for (const [, text] of captions) {
      assert.ok(text.trim().length > 20, "figcaption is too short to describe the clip");
    }
  });
});

describe("widgets", () => {
  it("ships the agent CLI transcript as real markup", () => {
    assert.match(html, /data-terminal\b/);
    // The pitch of the section is that an agent drives Wardian the same way a
    // person does, so the transcript has to show coordination, not just one
    // command.
    assert.match(html, /wardian agent list/);
    assert.match(html, /wardian ask /);
    assert.match(html, /wardian memory save/);
    assert.match(html, /--evidence/);
    // The transcript is in the HTML, so it reads correctly without scripting.
    assert.ok(html.split("$ wardian").length - 1 >= 4);
  });

  it("shows a stored memory with its evidence and superseded revision", () => {
    assert.match(html, /class="record"/);
    assert.match(html, /class="record-evidence"/);
    // Provenance is the claim: the excerpt it came from, and the fact that an
    // update keeps the older revision instead of overwriting it.
    assert.match(html, /Evidence/);
    assert.match(html, /superseded/);
    assert.match(html, /rev 1/);
    assert.match(html, /rev 2/);
  });

  it("gives every download a platform mark", () => {
    const icons = [...html.matchAll(/class="dl-icon"/g)];
    const headings = [...html.matchAll(/<h3><svg class="dl-icon"/g)];
    assert.equal(icons.length, 5, "expected one mark per download");
    assert.equal(headings.length, 5, "every download heading leads with its mark");
  });

  it("does not claim macOS builds are unsigned", () => {
    // Releases are Developer ID signed and notarized; the old copy said the
    // opposite and would have sent Mac users hunting for a Gatekeeper override.
    assert.doesNotMatch(html, /unsigned/i);
    assert.match(html, /Developer ID signed and notarized/);
  });
});

describe("progressive enhancement", () => {
  it("gates the clips on a scripting marker so the posters render without it", async () => {
    const css = await readFile("styles.css", "utf8");

    assert.match(html, /document\.documentElement\.classList\.add\("js"\)/);
    assert.match(css, /\.feature-media video \{\s*display: none;/);
    assert.match(css, /\.js \.feature-media video \{\s*display: block;\s*\}/);
  });

  it("keeps the enhancement script out of the critical path", () => {
    assert.match(html, /<script type="module" src="assets\/site\.mjs"><\/script>/);
    assert.ok(existsSync("assets/site.mjs"));
  });
});

describe("no comparative claims", () => {
  // The feature matrix explicitly disclaims proof of absence, so the site
  // describes Wardian only.
  const banned = [
    /\bonly Wardian\b/i,
    /\bunlike (other|any)\b/i,
    /\bno other (tool|product|app)\b/i,
    /\bthe only (tool|product|app)\b/i,
    /\bcompetitor\b/i,
    /\bbetter than\b/i,
  ];

  it("index.html makes no comparison", () => {
    for (const pattern of banned) {
      assert.doesNotMatch(html, pattern, `comparative claim matched ${pattern}`);
    }
  });
});
