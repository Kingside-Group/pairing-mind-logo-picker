/* Pairing Mind logo picker.
   Every logo on the page is built as SVG with the letters converted to outlines,
   so what people see is exactly what they export. */

const MARK_PATH = "M614.702 121.018C568.004 67.0353 505.918 28.621 436.768 10.9258C367.618 -6.76935 294.711 -2.89928 227.823 22.0171C160.935 46.9334 103.265 91.7048 62.544 150.328C21.8235 208.951 0 278.622 0 350C0 421.378 21.8235 491.05 62.544 549.672C103.265 608.295 160.935 653.067 227.823 677.983C294.711 702.899 367.618 706.769 436.768 689.074C505.918 671.379 568.004 632.965 614.702 578.982C560.353 570.13 510.925 542.235 475.256 500.285C439.586 458.335 420 405.065 420 350C420 294.935 439.586 241.666 475.256 199.716C510.925 157.766 560.353 129.87 614.702 121.018Z";

const TEXTURES = {
  flat:   { label: "Flat",         note: "Solid color. Clean at every size.", current: true },
  lifted: { label: "Lifted flat",  note: "Solid color with a soft shadow beneath." },
  satin:  { label: "Soft satin",   note: "Gentle light across the surface." },
  edge:   { label: "Defined edge", note: "Crisper highlights. The most dimensional." },
};
const STYLES = {
  original: { label: "pairing mind", note: "One font, all lowercase. The current wordmark.", current: true },
  caps:     { label: "pairing MIND", note: "MIND in capitals, set in an italic serif." },
};
const FONTS = {
  jakarta: { label: "Plus Jakarta Sans", note: "The current website font", track: -35, current: true },
  archivo: { label: "Archivo", note: "Firmer and more grounded", track: -20 },
  outfit:  { label: "Outfit", note: "Rounder and friendlier", track: -15 },
};
const WEIGHTS = { 600: "Medium", 750: "Bold" };
const SPACING = [
  { key: "pair", label: "Letters in “pairing”", help: "Space between each letter of pairing.", min: -50, max: 50, step: 5, ends: ["Tighter", "Looser"] },
  { key: "mind", label: "Letters in “mind”", help: "Space between each letter of mind.", min: -60, max: 60, step: 5, ends: ["Tighter", "Looser"] },
  { key: "gap",  label: "Gap between the words", help: "Space between pairing and mind.", min: -200, max: 200, step: 10, ends: ["Closer", "Further"] },
  { key: "mark", label: "Gap between symbol and name", help: "Space between the symbol and the wordmark.", min: -300, max: 300, step: 10, ends: ["Closer", "Further"] },
  { key: "size", label: "Symbol size", help: "How large the symbol is next to the name.", min: -50, max: 50, step: 5, ends: ["Smaller", "Larger"] },
];
const STEPS = [
  { id: "finish",  label: "Symbol finish" },
  { id: "font", label: "Font" },
  { id: "wordmark", label: "Wordmark" },
  { id: "lettering", label: "Lettering" },
  { id: "spacing", label: "Spacing" },
  { id: "export",  label: "Export" },
];

const DEFAULTS = {
  texture: "flat", style: "original", font: "jakarta",
  capP: false, blueAi: true, weight: 750, layout: "row",
  sp: { pair: 0, mind: 0, gap: 0, mark: 0, size: 0 },
};
let state = structuredClone(DEFAULTS);
let step = 0;
let surface = "both";
const fonts = {};
let uid = 0;

/* ---------- Fonts ---------- */
async function loadFont(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  return opentype.parse(await res.arrayBuffer());
}
async function loadFonts() {
  const jobs = [];
  for (const f of Object.keys(FONTS)) for (const w of Object.keys(WEIGHTS)) {
    jobs.push(loadFont(`fonts/${f}-${w}.ttf`).then(font => { fonts[`${f}-${w}`] = font; }));
  }
  jobs.push(loadFont("fonts/newsreader-italic-400.ttf").then(font => { fonts.newsreader = font; }));
  await Promise.all(jobs);
}

/* Lay out one word as outlines. accent = glyph indexes drawn in the accent color. */
function setWord(font, str, size, trackEm, accent = []) {
  const glyphs = font.stringToGlyphs(str);
  const scale = size / font.unitsPerEm;
  let x = 0, base = "", acc = "";
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, 0, size);
    const bb = p.getBoundingBox();
    if (bb.x2 > bb.x1) { x1 = Math.min(x1, bb.x1); y1 = Math.min(y1, bb.y1); x2 = Math.max(x2, bb.x2); y2 = Math.max(y2, bb.y2); }
    const d = p.toPathData(2);
    if (accent.includes(i)) acc += d; else base += d;
    x += g.advanceWidth * scale;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * scale + trackEm * size;
  });
  return { base, acc, advance: x, box: { x1, y1, x2, y2 } };
}

/* ---------- Symbol finishes ---------- */
function markDefs(texture, theme, id) {
  const dark = theme === "dark";
  const relief = (blur, scale, constant, exp, k3, dy, sd, op) => `
    <filter id="${id}-f" x="-25%" y="-25%" width="160%" height="170%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="blur"/>
      <feSpecularLighting in="blur" surfaceScale="${scale}" specularConstant="${constant}" specularExponent="${exp}" lighting-color="#ffffff" result="light"><feDistantLight azimuth="225" elevation="48"/></feSpecularLighting>
      <feComposite in="light" in2="SourceAlpha" operator="in" result="edge"/>
      <feComposite in="SourceGraphic" in2="edge" operator="arithmetic" k1="0" k2="1" k3="${k3}" k4="0" result="lit"/>
      <feDropShadow in="lit" dx="0" dy="${dy}" stdDeviation="${sd}" flood-color="#081525" flood-opacity="${op}"/>
    </filter>`;
  if (texture === "flat") return { defs: "", body: dark ? "#F3F5F8" : "#26282B", disk: "#367CFF", filter: "" };
  if (texture === "lifted") return {
    defs: `<filter id="${id}-f" x="-25%" y="-25%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="13" flood-color="#10243d" flood-opacity="${dark ? .45 : .18}"/></filter>`,
    body: dark ? "#EEF2F8" : "#26282B", disk: "#367CFF", filter: `url(#${id}-f)`,
  };
  if (texture === "satin") return {
    defs: (dark
      ? `<linearGradient id="${id}-b" x2=".7" y2="1"><stop stop-color="#ffffff"/><stop offset=".6" stop-color="#e2e9f2"/><stop offset="1" stop-color="#bdcada"/></linearGradient>`
      : `<linearGradient id="${id}-b" x2=".65" y2="1"><stop stop-color="#596373"/><stop offset=".55" stop-color="#343e4d"/><stop offset="1" stop-color="#29323e"/></linearGradient>`)
      + `<radialGradient id="${id}-d" cx=".2" cy=".12" r="1.1"><stop stop-color="#83b2ff"/><stop offset=".48" stop-color="#4387fc"/><stop offset="1" stop-color="#225dcf"/></radialGradient>`
      + relief(12, 3, .15, 12, .4, 9, 15, dark ? .35 : .15),
    body: `url(#${id}-b)`, disk: `url(#${id}-d)`, filter: `url(#${id}-f)`,
  };
  return {
    defs: (dark
      ? `<linearGradient id="${id}-b" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#ffffff"/><stop offset=".4" stop-color="#edf1f7"/><stop offset="1" stop-color="#aebdce"/></linearGradient>`
      : `<linearGradient id="${id}-b" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#606976"/><stop offset=".22" stop-color="#363e4a"/><stop offset=".68" stop-color="#242b35"/><stop offset="1" stop-color="#121822"/></linearGradient>`)
      + `<radialGradient id="${id}-d" cx=".28" cy=".18" r=".9"><stop stop-color="#78adff"/><stop offset=".35" stop-color="#4289ff"/><stop offset=".8" stop-color="#1b5ae0"/><stop offset="1" stop-color="#1041ae"/></radialGradient>`
      + relief(5, 9, .5, 22, .65, 18, 16, dark ? .4 : .23),
    body: `url(#${id}-b)`, disk: `url(#${id}-d)`, filter: `url(#${id}-f)`,
  };
}
function markGroup(m, x, y, h) {
  const k = h / 700;
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${k.toFixed(5)})"><g${m.filter ? ` filter="${m.filter}"` : ""}><path d="${MARK_PATH}" fill="${m.body}"/><circle cx="652" cy="350" r="168" fill="${m.disk}"/></g></g>`;
}
const r = n => Math.round(n * 100) / 100;

/* ---------- Lockup ----------
   opts: theme light|dark, layout row|stack|mark|word, bg colour or null, px output width */
function buildSVG(s, opts = {}) {
  const theme = opts.theme || "light";
  const layout = opts.layout || s.layout;
  const id = `pm${++uid}`;
  const S = 100;
  const sp = s.sp;
  const ink = theme === "dark" ? "#F3F5F8" : "#26282B";
  const aiColor = s.blueAi ? (theme === "dark" ? "#7EAEFF" : "#367CFF") : ink;
  const m = markDefs(s.texture, theme, id);
  const pf = fonts[`${s.font}-${s.weight}`];
  const baseTrack = FONTS[s.font].track;

  const pair = setWord(pf, (s.capP ? "P" : "p") + "airing", S, (baseTrack + sp.pair) / 1000, [1, 2]);
  let mind, gapW;
  if (s.style === "caps") {
    mind = setWord(fonts.newsreader, "MIND", S * 1.02, (35 + sp.mind) / 1000);
    gapW = 0.16 * S;
  } else {
    mind = setWord(pf, "mind", S, (baseTrack + sp.mind) / 1000);
    gapW = pf.charToGlyph(" ").advanceWidth * S / pf.unitsPerEm + baseTrack / 1000 * S;
  }
  gapW += sp.gap / 1000 * S;
  const mindX = pair.advance + gapW;
  const tb = { x1: pair.box.x1, y1: Math.min(pair.box.y1, mind.box.y1), x2: mindX + mind.box.x2, y2: Math.max(pair.box.y2, mind.box.y2) };
  const capH = (pf.tables.os2 && pf.tables.os2.sCapHeight ? pf.tables.os2.sCapHeight : pf.unitsPerEm * .7) * S / pf.unitsPerEm;
  const xH = (pf.tables.os2 && pf.tables.os2.sxHeight ? pf.tables.os2.sxHeight : pf.unitsPerEm * .5) * S / pf.unitsPerEm;

  const sizeK = 1 + sp.size / 100;
  let parts = [], box;
  const words = (tx, ty) => `<g transform="translate(${r(tx)} ${r(ty)})"><path d="${pair.base}" fill="${ink}"/><path d="${pair.acc}" fill="${aiColor}"/><path d="${mind.base}" fill="${ink}" transform="translate(${r(mindX)} 0)"/></g>`;

  if (layout === "mark") {
    const h = 700 / 4; parts.push(markGroup(m, 0, 0, h)); box = { x1: 0, y1: 0, x2: h * 820 / 700, y2: h };
  } else if (layout === "word") {
    parts.push(words(0, 0)); box = tb;
  } else if (layout === "stack") {
    const mh = 2.6 * S * sizeK, mw = mh * 820 / 700;
    const gap = (0.55 + sp.mark / 1000) * S;
    const textW = tb.x2 - tb.x1;
    const cx = textW / 2;
    const markTop = tb.y1 - gap - mh;
    parts.push(markGroup(m, cx - mw / 2, markTop, mh));
    parts.push(words(-tb.x1, 0));
    box = { x1: Math.min(0, cx - mw / 2), y1: markTop, x2: Math.max(textW, cx + mw / 2), y2: tb.y2 };
  } else {
    const mh = 1.6 * S * sizeK, mw = mh * 820 / 700;
    const gap = (0.38 + sp.mark / 1000) * S;
    const centre = -(capH + xH) / 4;
    const my = centre - mh / 2;
    const tx = mw + gap - tb.x1;
    parts.push(markGroup(m, 0, my, mh));
    parts.push(words(tx, 0));
    box = { x1: 0, y1: Math.min(my, tb.y1), x2: tx + tb.x2, y2: Math.max(my + mh, tb.y2) };
  }
  const pad = (m.filter ? 0.32 : 0.12) * S;
  const vb = { x: box.x1 - pad, y: box.y1 - pad, w: box.x2 - box.x1 + pad * 2, h: box.y2 - box.y1 + pad * 2 };
  const pxW = opts.px || Math.round(vb.w * 2);
  const pxH = Math.round(pxW * vb.h / vb.w);
  const bg = opts.bg ? `<rect x="${r(vb.x)}" y="${r(vb.y)}" width="${r(vb.w)}" height="${r(vb.h)}" fill="${opts.bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(vb.x)} ${r(vb.y)} ${r(vb.w)} ${r(vb.h)}" width="${pxW}" height="${pxH}" role="img" aria-label="Pairing Mind logo"><title>Pairing Mind</title>${m.defs ? `<defs>${m.defs}</defs>` : ""}${bg}${parts.join("")}</svg>`;
}

/* ---------- Words for the summary ---------- */
function wordText(s) {
  const p = (s.capP ? "P" : "p") + "airing";
  return s.style === "caps" ? `${p} MIND` : `${p} mind`;
}
function spacingText(s) {
  const moved = SPACING.filter(o => s.sp[o.key] !== 0).map(o => o.label.replace(/[“”]/g, ""));
  return moved.length ? `Adjusted: ${moved.join(", ")}` : "Spacing as designed";
}
function summaryList(s) {
  return [
    ["Symbol finish", TEXTURES[s.texture].label],
    ["Wordmark", STYLES[s.style].label],
    ["Font", FONTS[s.font].label],
    ["First letter", s.capP ? "Capital P" : "Lowercase p"],
    ["The “ai”", s.blueAi ? "Blue" : "Same color as the name"],
    ["Weight", WEIGHTS[s.weight]],
    ["Spacing", spacingText(s)],
    ["Layout", s.layout === "stack" ? "Stacked" : "Side by side"],
  ];
}
function summaryLine(s) {
  return `${TEXTURES[s.texture].label} · ${wordText(s)} · ${FONTS[s.font].label} ${WEIGHTS[s.weight]} · ${s.blueAi ? "blue ai" : "no blue ai"}`;
}

/* ---------- Rendering ---------- */
const $ = sel => document.querySelector(sel);
const main = $("#main");
const theme = () => (surface === "dark" ? "dark" : "light");
/* Option previews: light and dark halves unless one surface is chosen. */
function stage(s, opts = {}) {
  const themes = surface === "both" ? ["light", "dark"] : [surface];
  return themes.map(t => `<div class="half ${t}">${buildSVG(s, { ...opts, theme: t })}</div>`).join("");
}

function card({ s, opts, title, note, pressed, current, onPick, stageClass = "" }) {
  const b = document.createElement("button");
  b.className = "opt";
  b.setAttribute("aria-pressed", String(pressed));
  b.innerHTML = `<div class="stage ${stageClass} ${surface === "both" ? "split" : ""}">${stage(s, opts)}</div><div class="meta"><b>${title}${current ? '<span class="tag">Current</span>' : ""}</b><span>${note}</span></div>`;
  b.addEventListener("click", () => { onPick(); render(); });
  return b;
}
const stepLabel = () => `Step ${step + 1} of ${STEPS.length}`;
function head(eyebrow, title, text) {
  const d = document.createElement("div");
  d.className = "step-head";
  d.innerHTML = `<div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div><p>${text}</p>`;
  return d;
}
function group(title, hint, cls = "grid") {
  const g = document.createElement("section");
  g.className = "group";
  g.innerHTML = `<div class="group-head"><h3>${title}</h3>${hint ? `<span>${hint}</span>` : ""}</div><div class="${cls}"></div>`;
  return g;
}
const variant = patch => ({ ...state, ...patch, sp: { ...state.sp, ...(patch.sp || {}) } });

function renderFinish() {
  main.append(head(stepLabel(), "Choose the symbol finish.", "The same symbol in four finishes. Pick the surface that feels right. The font comes next."));
  const g = group("Symbol finish", "");
  const grid = g.querySelector(".grid");
  for (const [k, t] of Object.entries(TEXTURES)) {
    const wrap = document.createElement("div");
    wrap.className = "cardwrap";
    wrap.append(card({
      s: variant({ texture: k }), opts: {layout: "mark"},
      title: t.label, note: t.note, current: t.current, pressed: state.texture === k, stageClass: "mark-only",
      onPick: () => { state.texture = k; },
    }));
    const zoom = document.createElement("button");
    zoom.className = "zoom";
    zoom.setAttribute("aria-label", `Zoom in on ${t.label}`);
    zoom.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"/></svg><span>Zoom</span>`;
    zoom.addEventListener("click", () => openZoom(k));
    wrap.append(zoom);
    grid.append(wrap);
  }
  main.append(g);
}

/* Focused view of one symbol finish, large, on light and dark. */
function openZoom(k) {
  let dlg = document.getElementById("zoom");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "zoom";
    dlg.setAttribute("aria-labelledby", "zoom-title");
    document.body.append(dlg);
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); dlg.querySelector("[data-go='1']").click(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); dlg.querySelector("[data-go='-1']").click(); }
    });
  }
  const keys = Object.keys(TEXTURES), t = TEXTURES[k], i = keys.indexOf(k);
  const chosen = state.texture === k;
  dlg.innerHTML = `
    <div class="zoom-head">
      <div><span class="eyebrow">Symbol finish ${i + 1} of ${keys.length}</span><h2 id="zoom-title">${t.label}${t.current ? ' <span class="tag">Current</span>' : ""}</h2><p>${t.note}</p></div>
      <button class="btn small" data-close>Close</button>
    </div>
    <div class="zoom-stage">
      <div class="half light">${buildSVG(variant({ texture: k }), { theme: "light", layout: "mark" })}</div>
      <div class="half dark">${buildSVG(variant({ texture: k }), { theme: "dark", layout: "mark" })}</div>
    </div>
    <div class="zoom-foot">
      <div class="zoom-nav"><button class="btn small" data-go="-1" aria-label="Previous finish">‹ Previous</button><button class="btn small" data-go="1" aria-label="Next finish">Next ›</button></div>
      <button class="btn ${chosen ? "" : "primary"}" data-choose ${chosen ? "disabled" : ""}>${chosen ? "Chosen" : "Choose this finish"}</button>
    </div>`;
  dlg.querySelector("[data-close]").addEventListener("click", () => dlg.close());
  dlg.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => openZoom(keys[(i + Number(b.dataset.go) + keys.length) % keys.length])));
  dlg.querySelector("[data-choose]").addEventListener("click", () => { state.texture = k; dlg.close(); render(); });
  if (!dlg.open) dlg.showModal();
  dlg.querySelector("[data-close]").focus();
  dlg.scrollTop = 0;
}

function renderFont() {
  main.append(head(stepLabel(), "Choose the font.", "Three fonts for the name. Your symbol finish is carried forward."));
  const g = group("Font", "Shown in the current wordmark");
  const grid = g.querySelector(".grid");
  for (const [fk, f] of Object.entries(FONTS)) {
    grid.append(card({
      s: variant({ font: fk }), opts: {},
      title: f.label, note: f.note, current: f.current, pressed: state.font === fk,
      onPick: () => { state.font = fk; },
    }));
  }
  main.append(g);
}

function renderWordmark() {
  main.append(head(stepLabel(), "Choose the wordmark.", "Two ways to write the name, in the font you picked."));
  const g = group("Wordmark", FONTS[state.font].label, "grid two");
  const grid = g.querySelector(".grid");
  for (const [sk, st] of Object.entries(STYLES)) {
    grid.append(card({
      s: variant({ style: sk }), opts: {},
      title: st.label, note: st.note, current: st.current, pressed: state.style === sk,
      onPick: () => { state.style = sk; },
    }));
  }
  main.append(g);
}

function renderLettering() {
  main.append(head(stepLabel(), "Style the lettering.", "Three quick questions. Answer yes or no and the preview updates."));
  const questions = [
    { q: "Capitalize the P?", help: "A capital reads as a proper name. Lowercase feels softer.", get: () => state.capP, set: v => { state.capP = v; }, current: false },
    { q: "Color the ai letters blue?", help: "Points to the AI inside pairing. Without it, the symbol carries the blue.", get: () => state.blueAi, set: v => { state.blueAi = v; }, current: true },
    { q: "Use bold letters?", help: "Bold holds up at small sizes. No gives a lighter, calmer medium weight.", get: () => state.weight === 750, set: v => { state.weight = v ? 750 : 600; }, current: true },
  ];
  const wrap = document.createElement("div");
  wrap.className = "spacing lettering";
  wrap.innerHTML = `<div class="big"><div class="hero">${stage(state)}</div></div><div class="sliders questions"></div>`;
  const list = wrap.querySelector(".questions");
  questions.forEach((o, i) => {
    const row = document.createElement("div");
    row.className = "question";
    const id = `q${i}`;
    row.innerHTML = `<div class="q-text"><h3 id="${id}">${o.q}</h3><p>${o.help}</p><p class="today">Website today: ${o.current ? "yes" : "no"}</p></div>
      <div class="yesno" role="radiogroup" aria-labelledby="${id}">
        ${[true, false].map(v => `<button role="radio" aria-checked="${o.get() === v}" data-v="${v}">${v ? "Yes" : "No"}</button>`).join("")}
      </div>`;
    row.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { o.set(b.dataset.v === "true"); render(); }));
    list.append(row);
  });
  main.append(wrap);
}

function renderSpacing() {
  main.append(head(stepLabel(), "Fine-tune the spacing.", "Move a slider to adjust. The middle of each slider is the spacing as designed."));
  const wrap = document.createElement("div");
  wrap.className = "spacing";
  wrap.innerHTML = `<div class="big"><div class="hero"></div><div class="smallcheck"></div></div><div class="sliders"></div>`;
  const hero = wrap.querySelector(".hero"), small = wrap.querySelector(".smallcheck"), sliders = wrap.querySelector(".sliders");
  const paint = () => {
    hero.innerHTML = stage(state);
    const themes = surface === "both" ? ["light", "dark"] : [surface];
    small.innerHTML = themes.map(t => `<div class="half ${t}">` + [["Website header", 36], ["App sidebar", 26], ["Small", 18]].map(([label, h]) =>
      `<figure>${buildSVG(state, { theme: t }).replace(/width="\d+" height="\d+"/, `height="${h}"`)}<figcaption>${label} · ${h}px</figcaption></figure>`).join("") + `</div>`).join("");
    paintSoFar();
  };
  for (const o of SPACING) {
    const row = document.createElement("div");
    row.className = "slider";
    const val = () => state.sp[o.key] === 0 ? "As designed" : (state.sp[o.key] > 0 ? `+${state.sp[o.key]}` : `${state.sp[o.key]}`);
    row.innerHTML = `<div class="slider-top"><label for="sp-${o.key}">${o.label}</label><output id="out-${o.key}">${val()}</output></div><p>${o.help}</p>
      <input type="range" id="sp-${o.key}" min="${o.min}" max="${o.max}" step="${o.step}" value="${state.sp[o.key]}">
      <div class="slider-scale"><span>${o.ends[0]}</span><span>${o.ends[1]}</span></div>`;
    const input = row.querySelector("input");
    input.addEventListener("input", () => { state.sp[o.key] = Number(input.value); row.querySelector("output").textContent = val(); paint(); saveHash(); });
    sliders.append(row);
  }
  const reset = document.createElement("button");
  reset.className = "reset";
  reset.textContent = "Reset all spacing";
  reset.addEventListener("click", () => { state.sp = { ...DEFAULTS.sp }; render(); });
  sliders.append(reset);
  main.append(wrap);
  paint();
}

function renderExport() {
  main.append(head(stepLabel(), "Review and export.", "Pick a layout, check it on light and dark, then download. Exports are true vector: letters are converted to shapes."));
  const g = group("Layout", "", "grid two");
  const grid = g.querySelector(".grid");
  for (const [k, title, note] of [["row", "Side by side", "For headers and navigation"], ["stack", "Stacked", "For square spaces and social profiles"]]) {
    grid.append(card({ s: variant({ layout: k }), opts: {}, title, note, pressed: state.layout === k, onPick: () => { state.layout = k; } }));
  }
  main.append(g);

  const final = document.createElement("div");
  final.className = "final";
  final.innerHTML = `<div class="panel light"><span class="eyebrow">On light</span>${buildSVG(state, { theme: "light" })}</div><div class="panel dark"><span class="eyebrow">On dark</span>${buildSVG(state, { theme: "dark" })}</div>`;
  main.append(final);

  const ex = document.createElement("div");
  ex.className = "export";
  ex.innerHTML = `<div class="box"><h3>Your picks</h3><ul class="summary">${summaryList(state).map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join("")}</ul>
    <div class="share"><button class="btn small" id="copy-link">Copy link to these picks</button><button class="btn small" id="copy-text">Copy picks as text</button></div></div>
    <div class="box"><h3>Download</h3>
      <div class="dl-grid"><span></span><span class="col">For light backgrounds</span><span class="col">For dark backgrounds</span>
      ${[["full", "Full logo", "Symbol and name"], ["word", "Name only", "No symbol"], ["mark", "Symbol only", "No name"]].map(([k, label, sub]) => `
        <div class="label">${label}<span>${sub}</span></div>
        ${["light", "dark"].map(t => `<div class="pair"><button class="btn small" data-dl="${k}" data-fmt="svg" data-theme="${t}">SVG</button><button class="btn small" data-dl="${k}" data-fmt="png" data-theme="${t}">PNG</button></div>`).join("")}`).join("")}
      </div>
      <label class="check"><input type="checkbox" id="with-bg"> Include a background (otherwise transparent)</label>
      <p class="note">SVG is vector: it scales to any size and the letters are shapes, so no fonts are needed. PNG is a 3000-pixel-wide image.</p>
    </div>`;
  main.append(ex);
  ex.querySelectorAll("[data-dl]").forEach(b => b.addEventListener("click", () => download(b.dataset.dl, b.dataset.fmt, b.dataset.theme)));
  ex.querySelector("#copy-link").addEventListener("click", () => copy(location.href, "Link copied"));
  ex.querySelector("#copy-text").addEventListener("click", () => copy(summaryList(state).map(([k, v]) => `${k}: ${v}`).join("\n") + `\n${location.href}`, "Picks copied"));
}

/* ---------- Export ---------- */
function fileName(kind, t, ext) {
  const what = kind === "full" ? (state.layout === "stack" ? "stacked" : "horizontal") : kind === "word" ? "wordmark" : "symbol";
  const word = kind === "mark" ? "" : `-${state.style === "caps" ? "MIND" : "mind"}-${state.font}`;
  return `pairing-mind-${what}-${state.texture}${word}-${t}.${ext}`;
}
async function download(kind, fmt, t) {
  const withBg = $("#with-bg").checked;
  const layout = kind === "full" ? state.layout : kind;
  const bg = withBg ? (t === "dark" ? "#1D232D" : "#FFFFFF") : null;
  const svg = buildSVG(state, { theme: t, layout, bg, px: fmt === "png" ? 3000 : undefined });
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], { type: "image/svg+xml" });
  if (fmt === "svg") return save(blob, fileName(kind, t, "svg"));
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    c.toBlob(b => save(b, fileName(kind, t, "png")), "image/png");
  };
  img.onerror = () => toast("PNG export failed in this browser. Try the SVG.");
  img.src = url;
}
function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`Downloaded ${name}`);
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast("Copy failed. Select the address bar instead."); }
}
function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

/* ---------- Link sharing ---------- */
function saveHash() {
  const s = state;
  const q = new URLSearchParams({ step: STEPS[step].id, t: s.texture, w: s.style, f: s.font, p: +s.capP, ai: +s.blueAi, wt: s.weight, l: s.layout, ...Object.fromEntries(Object.entries(s.sp).map(([k, v]) => [`s_${k}`, v])) });
  history.replaceState(null, "", `#${q}`);
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (!q.size) return;
  const pick = (v, ok, d) => (ok.includes(v) ? v : d);
  state.texture = pick(q.get("t"), Object.keys(TEXTURES), state.texture);
  state.style = pick(q.get("w"), Object.keys(STYLES), state.style);
  state.font = pick(q.get("f"), Object.keys(FONTS), state.font);
  if (q.has("p")) state.capP = q.get("p") === "1";
  if (q.has("ai")) state.blueAi = q.get("ai") === "1";
  state.weight = Number(pick(q.get("wt"), ["600", "750"], String(state.weight)));
  state.layout = pick(q.get("l"), ["row", "stack"], state.layout);
  for (const o of SPACING) {
    const v = Number(q.get(`s_${o.key}`));
    if (Number.isFinite(v)) state.sp[o.key] = Math.max(o.min, Math.min(o.max, v));
  }
  const i = STEPS.findIndex(s => s.id === q.get("step"));
  if (i >= 0) step = i;
}

/* ---------- Shell ---------- */
function paintSoFar() {
  $("#sofar-preview").innerHTML = stage(state);
  $("#sofar-summary").textContent = summaryLine(state);
}
function paintSteps() {
  const nav = $(".steps");
  nav.innerHTML = "";
  STEPS.forEach((s, i) => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="n">${i + 1}</span><span class="label">${s.label}</span>`;
    if (i === step) b.setAttribute("aria-current", "step");
    if (i < step) b.classList.add("done");
    b.addEventListener("click", () => go(i));
    nav.append(b);
  });
  $("#back").disabled = step === 0;
  $("#next").textContent = step === STEPS.length - 1 ? "Start over" : `Next: ${STEPS[step + 1].label}`;
  $("#next").classList.toggle("primary", step < STEPS.length - 1);
  $("#step-count").textContent = `Step ${step + 1} of ${STEPS.length}`;
}
function render() {
  const y = window.scrollY;
  main.innerHTML = "";
  [renderFinish, renderFont, renderWordmark, renderLettering, renderSpacing, renderExport][step]();
  paintSteps();
  paintSoFar();
  saveHash();
  window.scrollTo(0, y);
}
function go(i) {
  step = Math.max(0, Math.min(STEPS.length - 1, i));
  render();
  window.scrollTo(0, 0);
}

$("#back").addEventListener("click", () => go(step - 1));
$("#next").addEventListener("click", () => {
  if (step === STEPS.length - 1) { if (confirm("Start over? Your picks will be cleared.")) { state = structuredClone(DEFAULTS); go(0); } } else go(step + 1);
});
document.querySelectorAll("[data-surface]").forEach(b => b.addEventListener("click", () => {
  surface = b.dataset.surface;
  document.body.classList.toggle("surface-dark", surface === "dark");
  document.querySelectorAll("[data-surface]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  render();
}));

loadFonts().then(() => { readHash(); render(); }).catch(err => {
  main.innerHTML = `<p class="loading">Could not load the logo fonts. ${err.message}</p>`;
});
