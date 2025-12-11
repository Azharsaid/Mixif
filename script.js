// Mixif Interactive Brochure – SAFE animation version
// Key change vs previous: we NO LONGER pre-hide or rescale everything.
// All animations are GSAP `.from(...)` so the original SVG design is the "truth".
// If GSAP fails, brochure still looks exactly like the static SVG pages.

// -----------------------------
// CONFIG
// -----------------------------
const TOTAL_PAGES = 29;

const PAGE_TITLES = {
  1: "Home",
  2: "Introduction",
  3: "Introduction (Data)",
  4: "Indications",
  5: "Pharyngitis / Tonsillitis",
  6: "Protection Flowchart",
  7: "Comparison Chart I",
  8: "Comparison Chart II",
  9: "Otitis Media Pathogens",
  10: "OME Negative Impacts",
  11: "Clinical Data II",
  12: "Clinical Data III",
  13: "Key Metric / Eradication",
  14: "UTI Pathogens",
  15: "UTI Susceptibility",
  16: "Side Effects Comparison",
  17: "Uncomplicated Urethral",
  18: "Gonococcal Regimens",
  19: "Bacterial Gastroenteritis",
  20: "Pharmacokinetics",
  21: "Formulations & Strengths",
  22: "Bioequivalence Study",
  23: "Dosing",
  24: "Key Messages Summary",
  25: "Reconstitution",
  26: "Syringe Use",
  27: "Why Mixif",
  28: "Final Key Messages",
  29: "References"
};

// Top navigation labels (same as home buttons)
const SECTION_NAV = [
  { label: "Introduction", page: 2 },
  { label: "Indications", page: 4 },
  { label: "Bioequivalence", page: 22 },
  { label: "Dosing", page: 23 },
  { label: "Reconstitution", page: 25 },
  { label: "Syringe", page: 26 },
  { label: "Why Mixif", page: 27 },
  { label: "References", page: 29 }
];

// SVG filenames: svg/mixif-page-01.svg ... svg/mixif-page-29.svg
const PAGES = Array.from({ length: TOTAL_PAGES }, (_, idx) => {
  const id = idx + 1;
  return {
    id,
    title: PAGE_TITLES[id] || `Page ${id}`,
    file: `svg/mixif-page-${String(id).padStart(2, "0")}.svg`
  };
});

// Reference text store (optional – you can fill it later)
const REFERENCES = {};

// -----------------------------
// RUNTIME GSAP CHECK
// -----------------------------
function hasGSAP() {
  return typeof window !== "undefined" && typeof window.gsap !== "undefined";
}

// -----------------------------
// STATE
// -----------------------------
let currentPageId = null;
const pageState = {}; // pageId -> { svgRoot, timeline }
let loaderHidden = false;

// -----------------------------
// DOM READY
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  try {
    initLoaderAnimation();
    buildNav();
    buildPages();
    setupSideNav();
    setupCitationModal();

    // Start at page 1
    goToPage(1, { instant: true });
    setTimeout(() => hideLoader(), 3500);
  } catch (err) {
    console.error("Init error:", err);
    hideLoader();
  }
});

// -----------------------------
// LOADER
// -----------------------------
function initLoaderAnimation() {
  const barFill = document.querySelector(".loader-bar-fill");
  if (!barFill || !hasGSAP()) return;

  gsap.fromTo(
    barFill,
    { scaleX: 0 },
    {
      scaleX: 1,
      duration: 1.8,
      ease: "power2.inOut",
      repeat: -1,
      yoyo: true,
      transformOrigin: "0% 50%"
    }
  );
}

function hideLoader() {
  if (loaderHidden) return;
  loaderHidden = true;
  const loader = document.getElementById("loader");
  if (!loader) return;

  if (!hasGSAP()) {
    loader.style.display = "none";
    return;
  }

  gsap.to(loader, {
    autoAlpha: 0,
    duration: 0.7,
    ease: "power2.inOut",
    onComplete: () => {
      loader.style.display = "none";
    }
  });
}

// -----------------------------
// NAV + PAGE SHELL
// -----------------------------
function buildNav() {
  const nav = document.getElementById("main-nav");
  if (!nav) return;

  nav.innerHTML = "";
  SECTION_NAV.forEach((section) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-btn";
    btn.textContent = section.label;
    btn.dataset.targetPage = section.page;
    btn.addEventListener("click", () => goToPage(section.page));
    nav.appendChild(btn);
  });

  updateNavActiveByPage(1);
}

function buildPages() {
  const container = document.getElementById("page-container");
  if (!container) return;

  PAGES.forEach((page) => {
    const section = document.createElement("section");
    section.className = "page";
    section.dataset.pageId = page.id;

    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";

    const obj = document.createElement("object");
    obj.className = "mixif-page-object";
    obj.type = "image/svg+xml";
    obj.data = page.file;
    obj.dataset.pageId = page.id;

    obj.addEventListener("load", () => onSvgLoaded(page.id, obj));

    wrapper.appendChild(obj);
    section.appendChild(wrapper);
    container.appendChild(section);
  });
}

function setupSideNav() {
  const prevBtn = document.querySelector(".js-prev-page");
  const nextBtn = document.querySelector(".js-next-page");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const target = currentPageId ? Math.max(1, currentPageId - 1) : 1;
      goToPage(target);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const target = currentPageId
        ? Math.min(TOTAL_PAGES, currentPageId + 1)
        : 2;
      goToPage(target);
    });
  }
}

// -----------------------------
// SVG LOAD
// -----------------------------
function onSvgLoaded(pageId, objectEl) {
  let doc = null;
  try {
    doc = objectEl.contentDocument;
  } catch (e) {
    console.error("Error accessing SVG contentDocument:", e);
  }
  if (!doc) return;

  try {
    const svgRoot = doc.querySelector("svg");
    if (!svgRoot) throw new Error("No <svg> root found");

    pageState[pageId] = {
      svgRoot,
      timeline: null
    };

    // Per-page wiring
    enhanceCitations(svgRoot);
    wireInternalNavigation(pageId, svgRoot);
    animateEternalLogo(svgRoot);

    // If user is already on this page when it loads, play its animation
    if (pageId === currentPageId && hasGSAP()) {
      playPage(pageId);
    }
  } catch (err) {
    console.error("Error in onSvgLoaded for page", pageId, err);
  }
}

// -----------------------------
// PAGE NAVIGATION
// -----------------------------
function goToPage(pageId, options = {}) {
  const { instant = false } = options;
  const targetSection = document.querySelector(
    `.page[data-page-id="${pageId}"]`
  );
  if (!targetSection) return;

  const oldSection = currentPageId
    ? document.querySelector(`.page[data-page-id="${currentPageId}"]`)
    : null;

  const direction = !currentPageId ? 1 : pageId > currentPageId ? 1 : -1;

  currentPageId = pageId;
  updatePageCounter(pageId);
  updateNavActiveByPage(pageId);

  if (!hasGSAP() || !oldSection || instant) {
    if (oldSection) {
      oldSection.classList.remove("active");
      oldSection.style.opacity = 0;
    }
    targetSection.classList.add("active");
    targetSection.style.opacity = 1;
    playPage(pageId);
    return;
  }

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut", duration: 0.7 }
  });

  tl.to(oldSection, {
    xPercent: -18 * direction,
    autoAlpha: 0
  }).fromTo(
    targetSection,
    { xPercent: 18 * direction, autoAlpha: 0 },
    {
      xPercent: 0,
      autoAlpha: 1,
      onStart: () => targetSection.classList.add("active"),
      onComplete: () => {
        oldSection.classList.remove("active");
        gsap.set(oldSection, { clearProps: "all", autoAlpha: 0 });
      }
    },
    "<"
  );

  tl.call(() => playPage(pageId), null, ">");
}

function updatePageCounter(pageId) {
  const el = document.getElementById("page-counter");
  if (!el) return;
  el.textContent = `${pageId} / ${TOTAL_PAGES}`;
}

function updateNavActiveByPage(pageId) {
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((btn) => {
    const target = Number(btn.dataset.targetPage);
    btn.classList.toggle("active", target === pageId);
  });
}

// -----------------------------
// PLAY PAGE TIMELINE
// -----------------------------
function playPage(pageId) {
  if (!hasGSAP()) return;
  const state = pageState[pageId];
  if (!state || !state.svgRoot) return;

  if (!state.timeline) {
    state.timeline = buildPageTimeline(pageId, state.svgRoot);
  }
  if (state.timeline) state.timeline.restart();
}

function buildPageTimeline(pageId, svg) {
  if (!hasGSAP()) return null;

  const tl = gsap.timeline({
    defaults: { ease: "power2.out" }
  });

  const texts = svg.querySelectorAll("text");
  const images = svg.querySelectorAll("image");
  const shapes = svg.querySelectorAll(
    "rect, circle, ellipse, line, polyline, polygon, path"
  );

  const { bigShapes, smallShapes } = splitShapesByArea(svg, shapes);

  // 1) Large background panels / cards (fade up slightly)
  if (bigShapes.length) {
    tl.from(
      bigShapes,
      {
        autoAlpha: 0,
        y: 12,
        duration: 1.0,
        stagger: 0.03
      },
      0
    );
  }

  // 2) Text – variant per type of slide
  if (pageId === 2 || pageId === 6 || pageId === 18 || pageId === 23) {
    animateTextFromSides(tl, svg, texts, 0.15);
  } else if (pageId === 25 || pageId === 26) {
    animateTextWave(tl, texts, 0.15);
  } else if (
    pageId === 7 ||
    pageId === 8 ||
    pageId === 15 ||
    pageId === 16 ||
    pageId === 22
  ) {
    animateTextFadeUp(tl, texts, 0.15);
  } else {
    animateTextFloat(tl, texts, 0.15);
  }

  // 3) Images / vectors
  if (pageId === 1) {
    animateImagesSoftScale(tl, images, 0.25);
  } else if (pageId === 10 || pageId === 18) {
    animateImagesPop(tl, images, 0.3);
  } else {
    animateImagesFloat(tl, images, 0.25);
  }

  // 4) Smaller shapes / icons
  if (smallShapes.length) {
    tl.from(
      smallShapes,
      {
        autoAlpha: 0,
        y: 8,
        duration: 0.9,
        stagger: 0.01
      },
      0.25
    );
  }

  // 5) Bars
  const bars = detectBars(svg);
  if (bars.length) {
    gsap.set(bars, { transformOrigin: "50% 100%" });
    tl.from(
      bars,
      {
        scaleY: 0,
        duration: 1.3,
        stagger: 0.12,
        ease: "power3.out"
      },
      0.4
    );
  }

  // 6) Curves / PK profiles
  const curves = detectCurves(svg);
  if (curves.length) {
    curves.forEach((curve, idx) => {
      const length = getPathLength(curve);
      if (!length) return;
      curve.style.strokeDasharray = length;
      curve.style.strokeDashoffset = length;
      tl.to(
        curve,
        {
          strokeDashoffset: 0,
          duration: 1.6 + idx * 0.25,
          ease: "power2.out"
        },
        0.45 + idx * 0.1
      );
    });
  }

  // 7) Percentage counters
  addPercentageNumberRolls(tl, svg);

  // 8) Page flavour
  if (pageId === 1) addPage1HubEffects(tl, svg);
  if (pageId === 3) addPage3MOASequence(tl, svg);
  if (pageId === 9) addPage9Blocks(tl, svg);
  if (pageId === 10) addPage10Icons(tl, svg);
  if (pageId === 13) addDonutPulse(tl, svg);
  if (pageId === 18) addPage18Regimens(tl, svg);

  return tl;
}

// -----------------------------
// SIZE / GEOMETRY HELPERS
// -----------------------------
function getSvgSize(svg) {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width && vb.height) {
    return { width: vb.width, height: vb.height };
  }
  return { width: 1280, height: 768 };
}

function splitShapesByArea(svg, shapes) {
  const size = getSvgSize(svg);
  const fullArea = size.width * size.height;
  const bigShapes = [];
  const smallShapes = [];

  shapes.forEach((el) => {
    const box = getBBoxSafe(el);
    if (!box) return;
    const area = box.width * box.height;
    if (area > fullArea * 0.05) bigShapes.push(el);
    else smallShapes.push(el);
  });

  return { bigShapes, smallShapes };
}

function getBBoxSafe(el) {
  try {
    return el.getBBox();
  } catch {
    return null;
  }
}

// -----------------------------
// TEXT ANIMATIONS
// -----------------------------
function animateTextFadeUp(tl, texts, start) {
  if (!texts.length) return;
  tl.from(
    texts,
    {
      autoAlpha: 0,
      y: 15,
      duration: 1.0,
      stagger: 0.025
    },
    start
  );
}

function animateTextFloat(tl, texts, start) {
  if (!texts.length) return;
  tl.from(
    texts,
    {
      autoAlpha: 0,
      y: 12,
      duration: 1.0,
      stagger: 0.02
    },
    start
  );
}

function animateTextFromSides(tl, svg, texts, start) {
  if (!texts.length) return;

  const size = getSvgSize(svg);
  const centerX = size.width / 2;

  const left = [];
  const right = [];
  const center = [];

  texts.forEach((t) => {
    const box = getBBoxSafe(t);
    if (!box) {
      center.push(t);
      return;
    }
    const midX = box.x + box.width / 2;
    if (midX < centerX - size.width * 0.08) left.push(t);
    else if (midX > centerX + size.width * 0.08) right.push(t);
    else center.push(t);
  });

  if (left.length) {
    tl.from(
      left,
      {
        autoAlpha: 0,
        x: -25,
        duration: 1.1,
        stagger: 0.03
      },
      start
    );
  }
  if (right.length) {
    tl.from(
      right,
      {
        autoAlpha: 0,
        x: 25,
        duration: 1.1,
        stagger: 0.03
      },
      start + 0.05
    );
  }
  if (center.length) {
    tl.from(
      center,
      {
        autoAlpha: 0,
        y: 15,
        duration: 1.0,
        stagger: 0.03
      },
      start + 0.08
    );
  }
}

function animateTextWave(tl, texts, start) {
  if (!texts.length) return;
  tl.from(
    texts,
    {
      autoAlpha: 0,
      y: 10,
      rotation: -4,
      duration: 1.1,
      stagger: 0.04,
      transformOrigin: "50% 50%"
    },
    start
  );
}

// -----------------------------
// IMAGE ANIMATIONS
// -----------------------------
function animateImagesSoftScale(tl, images, start) {
  if (!images.length) return;
  tl.from(
    images,
    {
      autoAlpha: 0,
      y: 15,
      scale: 0.96,
      duration: 1.0,
      stagger: 0.05,
      transformOrigin: "50% 50%"
    },
    start
  );
}

function animateImagesPop(tl, images, start) {
  if (!images.length) return;
  tl.from(
    images,
    {
      autoAlpha: 0,
      y: 12,
      scale: 0.85,
      duration: 0.9,
      stagger: 0.06,
      transformOrigin: "50% 50%"
    },
    start
  );
}

function animateImagesFloat(tl, images, start) {
  if (!images.length) return;
  tl.from(
    images,
    {
      autoAlpha: 0,
      y: 12,
      scale: 0.97,
      duration: 1.0,
      stagger: 0.05
    },
    start
  );
}

// -----------------------------
// BARS & CURVES
// -----------------------------
function detectBars(svg) {
  const size = getSvgSize(svg);
  const w = size.width;
  const h = size.height;
  const bars = [];

  const candidates = svg.querySelectorAll("rect, path");
  candidates.forEach((el) => {
    const box = getBBoxSafe(el);
    if (!box) return;

    const aspect = box.height / (box.width || 1);
    const relHeight = box.height / h;
    const relWidth = box.width / w;

    if (
      relHeight > 0.12 &&
      relWidth < 0.2 &&
      aspect > 1.5 &&
      box.x > w * 0.03 &&
      box.x < w * 0.97 &&
      box.y > h * 0.12 &&
      box.y < h * 0.97
    ) {
      bars.push(el);
    }
  });

  return bars;
}

function detectCurves(svg) {
  const size = getSvgSize(svg);
  const w = size.width;
  const h = size.height;
  const result = [];

  const polylines = svg.querySelectorAll("polyline");
  polylines.forEach((pl) => result.push(pl));

  const paths = svg.querySelectorAll("path");
  paths.forEach((p) => {
    const length = getPathLength(p);
    if (!length || length < Math.min(w, h) * 0.35) return;
    const box = getBBoxSafe(p);
    if (!box) return;

    const relWidth = box.width / w;
    const relHeight = box.height / h;

    if (
      relWidth > 0.25 &&
      relHeight > 0.12 &&
      relHeight < 0.8 &&
      box.y > h * 0.02 &&
      box.y < h * 0.98
    ) {
      result.push(p);
    }
  });

  return result;
}

function getPathLength(el) {
  try {
    if (typeof el.getTotalLength === "function") {
      return el.getTotalLength();
    }
    return null;
  } catch {
    return null;
  }
}

// -----------------------------
// PERCENTAGE COUNTERS & DONUT
// -----------------------------
function addPercentageNumberRolls(tl, svg) {
  const texts = svg.querySelectorAll("text");
  texts.forEach((node) => {
    const raw = (node.textContent || "").trim();
    const m = raw.match(/(\d+[\d.,]*)(\s*%)/);
    if (!m) return;

    const numStr = m[1];
    const suffix = raw.slice(m.index + numStr.length) || "";
    const finalValue = parseFloat(numStr.replace(",", "."));
    if (Number.isNaN(finalValue)) return;

    const counter = { value: 0 };

    tl.fromTo(
      counter,
      { value: 0 },
      {
        value: finalValue,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          const formatted =
            finalValue % 1 === 0
              ? Math.round(counter.value).toString()
              : counter.value.toFixed(1);
          node.textContent = formatted + suffix;
        }
      },
      0.6
    );
  });
}

function addDonutPulse(tl, svg) {
  if (!hasGSAP()) return;

  const circles = svg.querySelectorAll("circle, ellipse");
  if (!circles.length) return;

  let biggest = null;
  let maxArea = 0;
  circles.forEach((c) => {
    const box = getBBoxSafe(c);
    if (!box) return;
    const area = box.width * box.height;
    if (area > maxArea) {
      maxArea = area;
      biggest = c;
    }
  });
  if (!biggest) return;

  const length = getPathLength(biggest);
  if (length) {
    biggest.style.strokeDasharray = length;
    biggest.style.strokeDashoffset = length;
    tl.to(
      biggest,
      {
        strokeDashoffset: 0,
        duration: 1.6,
        ease: "power2.out"
      },
      0.4
    );
  }

  gsap.to(biggest, {
    scale: 1.02,
    duration: 2.2,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
    transformOrigin: "50% 50%"
  });
}

// -----------------------------
// PAGE-SPECIFIC EFFECTS
// -----------------------------
function addPage1HubEffects(tl, svg) {
  if (!hasGSAP()) return;

  tl.from(
    svg,
    {
      autoAlpha: 0,
      scale: 0.97,
      duration: 1.1,
      transformOrigin: "50% 50%"
    },
    0
  );

  // Subtle breathing of full hub
  gsap.to(svg, {
    scale: 1.01,
    duration: 3.4,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
    transformOrigin: "50% 50%"
  });
}

function addPage3MOASequence(tl, svg) {
  if (!hasGSAP()) return;

  const molecule = svg.getElementById("moa-molecule");
  const wall = svg.getElementById("moa-wall");

  if (molecule) {
    tl.from(
      molecule,
      {
        autoAlpha: 0,
        scale: 0.6,
        duration: 1.0,
        transformOrigin: "50% 50%"
      },
      0.25
    );
    tl.to(
      molecule,
      { x: "+=70", duration: 1.4, ease: "power2.inOut" },
      0.6
    );
  }

  if (wall) {
    tl.to(
      wall,
      {
        duration: 1.1,
        onStart: () => {
          gsap.fromTo(
            wall,
            { x: -3 },
            { x: 3, duration: 0.14, yoyo: true, repeat: 9 }
          );
        }
      },
      0.8
    );
    tl.to(wall, { autoAlpha: 0.25, duration: 0.7 }, 1.15);
  }
}

function addPage9Blocks(tl, svg) {
  if (!hasGSAP()) return;

  const size = getSvgSize(svg);
  const h = size.height;
  const w = size.width;

  const blocks = Array.from(svg.querySelectorAll("rect")).filter((r) => {
    const box = getBBoxSafe(r);
    if (!box) return false;
    return (
      box.width > w * 0.12 &&
      box.width < w * 0.5 &&
      box.height > h * 0.08 &&
      box.height < h * 0.4 &&
      box.y > h * 0.25 &&
      box.y < h * 0.9
    );
  });

  if (!blocks.length) return;

  tl.from(
    blocks,
    {
      autoAlpha: 0,
      y: 22,
      scale: 0.96,
      duration: 1.0,
      stagger: 0.18
    },
    0.35
  );
}

function addPage10Icons(tl, svg) {
  if (!hasGSAP()) return;

  const icons = svg.querySelectorAll("image");
  if (!icons.length) return;

  tl.from(
    icons,
    {
      autoAlpha: 0,
      scale: 0.86,
      duration: 0.9,
      stagger: 0.18,
      transformOrigin: "50% 50%"
    },
    0.35
  ).add(() => {
    icons.forEach((icon) => {
      gsap.to(icon, {
        rotation: 4,
        duration: 0.16,
        yoyo: true,
        repeat: 3,
        transformOrigin: "50% 50%"
      });
    });
  }, 0.9);
}

function addPage18Regimens(tl, svg) {
  if (!hasGSAP()) return;

  const size = getSvgSize(svg);
  const h = size.height;

  const cards = Array.from(svg.querySelectorAll("rect")).filter((r) => {
    const b = getBBoxSafe(r);
    if (!b) return false;
    return b.height > h * 0.08 && b.height < h * 0.35;
  });

  if (!cards.length) return;

  tl.from(
    cards,
    {
      autoAlpha: 0,
      y: 24,
      scale: 0.95,
      duration: 1.0,
      stagger: 0.12
    },
    0.4
  );
}

// -----------------------------
// INTERNAL INTERACTIONS
// -----------------------------
function wireInternalNavigation(pageId, svg) {
  wireNextPrevIcons(pageId, svg);
  wireHomeIcon(pageId, svg);

  if (pageId === 1) {
    wireHomePageButtons(svg);
  }
  if (pageId === 4) {
    wireIndicationsLinks(svg);
  }
  if (pageId === 25 || pageId === 26) {
    wireStepSequence(svg);
  }
}

// HOME ICON (bottom-right)
function wireHomeIcon(pageId, svg) {
  if (pageId === 1 || !hasGSAP()) return;

  const homeNode = findHomeIconCandidate(svg);
  if (!homeNode) return;

  homeNode.style.cursor = "pointer";
  homeNode.addEventListener("click", () => goToPage(1));

  gsap.to(homeNode, {
    scale: 1.05,
    duration: 1.6,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
    transformOrigin: "50% 50%"
  });
}

function findHomeIconCandidate(svg) {
  const idCandidates = ["home", "home-icon", "house", "mixif-home"];
  for (const id of idCandidates) {
    const el = svg.getElementById(id);
    if (el) return el;
  }

  const guess = Array.from(svg.querySelectorAll("[id]")).find((el) =>
    /home|house/i.test(el.id)
  );
  if (guess) return guess;

  const size = getSvgSize(svg);
  const w = size.width;
  const h = size.height;

  const all = svg.querySelectorAll(
    "g, image, rect, path, circle, ellipse, polygon"
  );
  let best = null;
  let bestArea = Infinity;
  all.forEach((el) => {
    const box = getBBoxSafe(el);
    if (!box) return;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (cx < w * 0.8 || cy < h * 0.8) return;
    const area = Math.max(1, box.width * box.height);
    if (area < bestArea) {
      bestArea = area;
      best = el;
    }
  });
  return best;
}

// HOME PAGE BUTTONS (left/right capsules on page 1)
function wireHomePageButtons(svg) {
  SECTION_NAV.forEach((section) => {
    attachTextNavigation(svg, section.label, section.page);
  });
}

// INDICATIONS DEEP LINKS (page 4)
function wireIndicationsLinks(svg) {
  const mapping = [
    { text: "Otitis media", page: 9 },
    { text: "Acute otitis media", page: 9 },
    { text: "Pharyngitis", page: 5 },
    { text: "tonsilitis", page: 5 },
    { text: "tonsillitis", page: 5 },
    { text: "Bacterial gastroenteritis", page: 19 },
    { text: "uncomplicated urinary", page: 14 },
    { text: "uncomplicated urethral", page: 17 }
  ];

  mapping.forEach((m) => attachTextNavigation(svg, m.text, m.page));
}

// Attach click to a text & its background capsule rect
function attachTextNavigation(svg, labelSubstring, targetPage) {
  const texts = Array.from(svg.querySelectorAll("text"));
  const normLabel = labelSubstring.toLowerCase();

  texts.forEach((t) => {
    if (t.dataset.navTargetAssigned === "true") return;

    const txt = (t.textContent || "").trim().toLowerCase();
    if (!txt || !txt.includes(normLabel)) return;

    t.dataset.navTargetAssigned = "true";
    t.style.cursor = "pointer";
    t.addEventListener("click", () => goToPage(targetPage));

    const rect = findBackgroundRectForText(svg, t);
    if (rect) {
      rect.style.cursor = "pointer";
      rect.addEventListener("click", () => goToPage(targetPage));
    }
  });
}

function findBackgroundRectForText(svg, textNode) {
  const box = getBBoxSafe(textNode);
  if (!box) return null;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const rects = svg.querySelectorAll("rect");
  let best = null;
  let bestArea = Infinity;

  rects.forEach((r) => {
    const b = getBBoxSafe(r);
    if (!b) return;
    const inside =
      cx >= b.x &&
      cx <= b.x + b.width &&
      cy >= b.y &&
      cy <= b.y + b.height;
    if (!inside) return;
    const area = b.width * b.height;
    if (area < bestArea) {
      bestArea = area;
      best = r;
    }
  });
  return best;
}

// Optional per-SVG next/prev icons (if present)
function wireNextPrevIcons(pageId, svg) {
  const nextIds = ["next", "next-btn", "nav-next"];
  const prevIds = ["prev", "prev-btn", "nav-prev"];

  let nextNode = null;
  let prevNode = null;

  nextIds.forEach((id) => {
    const el = svg.getElementById(id);
    if (el) nextNode = el;
  });
  prevIds.forEach((id) => {
    const el = svg.getElementById(id);
    if (el) prevNode = el;
  });

  if (nextNode) {
    nextNode.style.cursor = "pointer";
    nextNode.addEventListener("click", () =>
      goToPage(Math.min(TOTAL_PAGES, pageId + 1))
    );
  }
  if (prevNode) {
    prevNode.style.cursor = "pointer";
    prevNode.addEventListener("click", () =>
      goToPage(Math.max(1, pageId - 1))
    );
  }
}

// Reconstitution & Syringe – step-by-step click-through
function wireStepSequence(svg) {
  if (!hasGSAP()) return;

  const steps = Array.from(svg.querySelectorAll("image"));
  if (!steps.length) return;

  let currentIndex = 0;

  function showStep(index) {
    steps.forEach((step, i) => {
      const active = i === index;
      gsap.to(step, {
        autoAlpha: active ? 1 : 0.25,
        scale: active ? 1.03 : 0.95,
        duration: 0.35
      });
    });
  }

  showStep(currentIndex);

  svg.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % steps.length;
    showStep(currentIndex);
  });
}

// -----------------------------
// ETERNAL TRUST LOGO
// -----------------------------
function animateEternalLogo(svg) {
  if (!hasGSAP()) return;

  let logo = svg.getElementById("eternal-logo");
  if (!logo) {
    const textNode = Array.from(svg.querySelectorAll("text")).find((t) =>
      (t.textContent || "").toLowerCase().includes("eternal")
    );
    if (textNode) logo = textNode.closest("g") || textNode;
  }

  if (!logo || logo.dataset.eternalAnimated) return;
  logo.dataset.eternalAnimated = "true";

  gsap.to(logo, {
    scale: 1.04,
    duration: 2.8,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
    transformOrigin: "50% 50%"
  });
}

// -----------------------------
// CITATIONS MODAL
// -----------------------------
function enhanceCitations(svg) {
  const nodes = svg.querySelectorAll("text, tspan");
  nodes.forEach((node) => {
    const raw = (node.textContent || "").trim();
    if (!/^\d{1,2}$/.test(raw)) return;

    node.style.cursor = "pointer";
    node.dataset.refId = raw;
    node.addEventListener("click", (evt) => {
      evt.preventDefault();
      openCitationModal(raw);
    });
  });
}

function setupCitationModal() {
  const modal = document.getElementById("citation-modal");
  if (!modal) return;

  const backdrop = modal.querySelector(".citation-backdrop");
  const closeBtn = modal.querySelector(".citation-close");

  const close = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  if (backdrop) backdrop.addEventListener("click", close);
  if (closeBtn) closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") close();
  });
}

function openCitationModal(refId) {
  const modal = document.getElementById("citation-modal");
  const idSpan = document.getElementById("citation-id");
  const textDiv = document.getElementById("citation-text");
  if (!modal || !idSpan || !textDiv) return;

  idSpan.textContent = refId;
  textDiv.textContent = getReferenceText(refId);

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function getReferenceText(refId) {
  if (REFERENCES[refId]) return REFERENCES[refId];
  return "Please see the References page in the brochure for full citation details.";
}
