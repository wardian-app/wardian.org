/**
 * Homepage behavior: lazy feature clips, the CLI terminal, and the automation
 * node diagram.
 *
 * Everything here is an enhancement. With scripting disabled the page still
 * renders its copy, the <noscript> poster for each clip, the full terminal
 * transcript, and the static node diagram.
 */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ------------------------------------------------------------------ clips */

/**
 * Promotes the `data-src` on each <source> to a real `src`. Clips ship with no
 * `src` at all so the browser cannot fetch eight videos on first paint.
 * @param {HTMLVideoElement} video
 */
function attachSources(video) {
  if (video.dataset.sourcesAttached === "true") return;
  for (const source of video.querySelectorAll("source[data-src]")) {
    source.src = source.dataset.src;
  }
  video.dataset.sourcesAttached = "true";
  video.load();
}

/**
 * @param {HTMLVideoElement} video
 */
function playClip(video) {
  attachSources(video);
  const started = video.play();
  if (started && typeof started.catch === "function") {
    // Autoplay can still be refused; the poster and the control remain usable.
    started.catch(() => {});
  }
}

function setupClips() {
  const clips = [...document.querySelectorAll("video.clip")];
  if (!clips.length) return;

  for (const video of clips) {
    const control = document.createElement("button");
    control.type = "button";
    control.className = "clip-control";
    control.dataset.clipControl = "true";

    const label = video.getAttribute("aria-label") ?? "clip";
    const shortLabel = label.replace(/^Silent looping recording of /i, "").replace(/\.$/, "");

    const setControl = (playing) => {
      control.textContent = playing ? "Pause" : "Play";
      control.setAttribute("aria-label", `${playing ? "Pause" : "Play"} the ${shortLabel}`);
    };
    setControl(false);

    control.addEventListener("click", () => {
      if (video.paused) {
        video.dataset.userPaused = "false";
        playClip(video);
      } else {
        video.dataset.userPaused = "true";
        video.pause();
      }
    });

    video.addEventListener("play", () => setControl(true));
    video.addEventListener("pause", () => setControl(false));
    video.parentElement?.appendChild(control);
  }

  if (!("IntersectionObserver" in window)) {
    // No observer: leave every clip on its poster with a working control.
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = /** @type {HTMLVideoElement} */ (entry.target);
        if (entry.isIntersecting) {
          if (reducedMotion.matches || video.dataset.userPaused === "true") continue;
          playClip(video);
        } else if (!video.paused) {
          video.pause();
        }
      }
    },
    { rootMargin: "200px 0px", threshold: 0.25 },
  );

  for (const video of clips) observer.observe(video);

  reducedMotion.addEventListener("change", (event) => {
    if (!event.matches) return;
    for (const video of clips) video.pause();
  });
}

/* --------------------------------------------------------------- terminal */

const TYPE_MS = 18;
const LINE_PAUSE_MS = 220;
const LOOP_PAUSE_MS = 4000;

function setupTerminal() {
  const terminal = document.querySelector("[data-terminal]");
  const body = terminal?.querySelector("[data-terminal-body]");
  const toggle = terminal?.querySelector("[data-terminal-toggle]");
  if (!terminal || !body || !toggle) return;

  const lines = [...body.querySelectorAll(".tl")].map((element) => ({
    element,
    text: element.textContent ?? "",
    isCommand: element.classList.contains("cmd"),
  }));
  if (!lines.length) return;

  const state = { paused: true, generation: 0 };

  const wait = (ms, generation) =>
    new Promise((resolve) => {
      const tick = () => {
        if (generation !== state.generation) {
          resolve(false);
          return;
        }
        if (state.paused) {
          window.setTimeout(tick, 120);
          return;
        }
        window.setTimeout(() => resolve(generation === state.generation), ms);
      };
      tick();
    });

  const clear = () => {
    for (const line of lines) line.element.textContent = "";
  };

  async function run(generation) {
    while (generation === state.generation) {
      clear();
      for (const line of lines) {
        if (line.isCommand) {
          for (let index = 1; index <= line.text.length; index += 1) {
            if (!(await wait(TYPE_MS, generation))) return;
            line.element.textContent = line.text.slice(0, index);
          }
        } else {
          if (!(await wait(LINE_PAUSE_MS, generation))) return;
          line.element.textContent = line.text;
        }
      }
      if (!(await wait(LOOP_PAUSE_MS, generation))) return;
    }
  }

  const setToggle = () => {
    toggle.textContent = state.paused ? "Play" : "Pause";
    toggle.setAttribute("aria-label", `${state.paused ? "Play" : "Pause"} the command line demo`);
  };

  const start = () => {
    if (reducedMotion.matches) return;
    if (!state.paused) return;
    state.paused = false;
    setToggle();
    state.generation += 1;
    void run(state.generation);
  };

  const stopToStatic = () => {
    state.generation += 1;
    state.paused = true;
    for (const line of lines) line.element.textContent = line.text;
    setToggle();
  };

  toggle.hidden = false;
  setToggle();
  toggle.addEventListener("click", () => {
    if (state.generation === 0) {
      start();
      return;
    }
    state.paused = !state.paused;
    setToggle();
  });

  if (reducedMotion.matches) {
    // Static transcript stays exactly as authored; nothing to pause.
    toggle.hidden = true;
    return;
  }

  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      stopToStatic();
      toggle.hidden = true;
    } else {
      toggle.hidden = false;
    }
  });

  if (!("IntersectionObserver" in window)) {
    start();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          start();
          observer.disconnect();
        }
      }
    },
    { rootMargin: "120px 0px", threshold: 0.2 },
  );
  observer.observe(terminal);
}

/* ----------------------------------------------------------- node diagram */

function setupNodeDiagram() {
  const diagram = document.querySelector("[data-node-diagram]");
  const caption = document.querySelector("[data-node-caption]");
  if (!diagram || !caption) return;

  const fallback = caption.textContent ?? "";
  const nodes = [...diagram.querySelectorAll(".node")];

  for (const node of nodes) {
    const describe = () => {
      caption.textContent = node.dataset.nodeCopy ?? fallback;
      for (const other of nodes) other.classList.toggle("is-dimmed", other !== node);
    };
    const reset = () => {
      caption.textContent = fallback;
      for (const other of nodes) other.classList.remove("is-dimmed");
    };

    node.addEventListener("mouseenter", describe);
    node.addEventListener("focus", describe);
    node.addEventListener("mouseleave", reset);
    node.addEventListener("blur", reset);
  }
}

setupClips();
setupTerminal();
setupNodeDiagram();
