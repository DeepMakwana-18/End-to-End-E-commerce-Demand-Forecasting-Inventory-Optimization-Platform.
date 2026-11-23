const modules = {
  forecast: {
    kicker: "Demand forecast intelligence",
    range: "HORIZON: 12 WEEKS · CONFIDENCE: 95%",
    question: "What demand is coming?",
    decision: "Forecast volume 12 weeks out with confidence bands to schedule POs ahead of supplier lead times.",
    title: "Quantify future demand with bounded uncertainty.",
    metricA: "±6.4%",
    metricALabel: "CONFIDENCE BAND",
    metricBLabel: "PROJECTED PEAK",
    metricB: "+18.4%",
    insight: "Upper confidence band warrants +240 safety stock buffer in Week 10."
  },
  inventory: {
    kicker: "Inventory health & replenishment",
    range: "COVERAGE TRACKER · SAFETY BUFFER WATCH",
    question: "What needs restocking?",
    decision: "Identify SKUs nearing stock thresholds and review suggested reorder quantities.",
    title: "Identify stock warnings and trigger timely replenishment.",
    metricA: "11 Days",
    metricALabel: "CRITICAL RUNWAY",
    metricBLabel: "REORDER NEEDED",
    metricB: "320 Units",
    insight: "SKU-204 is below its illustrative 18-day coverage target; review replenishment timing."
  },
  risk: {
    kicker: "Anomaly detection & risk radar",
    range: "ILLUSTRATIVE DATA · THREE SIGNALS TO EXPLORE",
    question: "What unusual changes require attention?",
    decision: "Select an observed change, review the evidence, and decide what deserves investigation.",
    title: "Spot what changed. Understand why it matters.",
    metricA: "+3.2σ",
    metricALabel: "ANOMALY SEVERITY",
    metricBLabel: "UNPLANNED SURGE",
    metricB: "+48%",
    insight: "An illustrative +3.2σ spike warrants investigation and an inventory response."
  },
  scenario: {
    kicker: "Scenario lab & what-if engine",
    range: "12-WEEK DEMAND SCENARIO · ILLUSTRATIVE",
    question: "What happens if demand, pricing or supply conditions change?",
    decision: "Explore promotion-driven demand before changing replenishment.",
    title: "Change one assumption. See the trade-offs.",
    metricA: "+20%",
    metricALabel: "DEMAND DELTA",
    metricBLabel: "STOCK COVERAGE",
    metricB: "9.2 days",
    insight: "Review replenishment: about 276 additional units reach the 13-day planning threshold under these example assumptions."
  }
};

const header = document.querySelector("[data-header]");
const darkScenes = [...document.querySelectorAll(".scene-dark")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const updateHeader = () => {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 38);
  const y = 46;
  const isDark = darkScenes.some(scene => {
    const rect = scene.getBoundingClientRect();
    return rect.top <= y && rect.bottom >= y;
  });
  header.classList.toggle("on-dark", isDark);
};

const observerOptions = {
  threshold: prefersReducedMotion ? 0 : 0.08,
  rootMargin: "0px 0px -40px 0px"
};

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(".reveal, .decision-orbit").forEach(el => {
  if (prefersReducedMotion) el.classList.add("visible");
  else revealObserver.observe(el);
});

const popObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      popObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(".pop-card").forEach(el => {
  if (prefersReducedMotion) el.classList.add("visible");
  else popObserver.observe(el);
});

const heroScene = document.querySelector(".hero");
const heroStage = document.querySelector(".hero-stage");

const clamp = value => Math.min(1, Math.max(0, value));

const updateCinematicScroll = () => {
  if (prefersReducedMotion) return;
  if (heroScene && heroStage) {
    const heroProgress = clamp(window.scrollY / Math.max(heroScene.offsetHeight, 1));
    heroStage.style.setProperty("--hero-scale", String((1 - heroProgress * 0.08).toFixed(3)));
    heroStage.style.setProperty("--hero-y", `${(heroProgress * 48).toFixed(1)}px`);
    heroStage.style.setProperty("--hero-fade", String((1 - heroProgress * 0.85).toFixed(3)));
  }
};

let scrollTicking = false;
const handleScroll = () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      updateHeader();
      updateCinematicScroll();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
};

window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("resize", handleScroll);
handleScroll();

const urlParams = new URLSearchParams(window.location.search);
const sectionParam = urlParams.get("section");
if (sectionParam) {
  document.body.classList.add("view-" + sectionParam);
}
const targetId = urlParams.get("target") || (window.location.hash ? window.location.hash.replace("#", "") : null);
if (targetId) {
  const targetEl = document.getElementById(targetId);
  if (targetEl) {
    document.documentElement.style.scrollBehavior = "auto";
    const top = targetEl.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo(0, top);
    handleScroll();
  }
}


const tabs = [...document.querySelectorAll("[data-module]")];
const fields = {
  kicker: document.querySelector("#module-kicker"),
  range: document.querySelector("#module-range"),
  question: document.querySelector("#module-question"),
  decision: document.querySelector("#module-decision"),
  title: document.querySelector("#module-title"),
  metricA: document.querySelector("#module-metric-a"),
  metricALabel: document.querySelector("#module-metric-a-label"),
  metricBLabel: document.querySelector("#module-metric-b-label"),
  metricB: document.querySelector("#module-metric-b"),
  insight: document.querySelector("#module-insight")
};
const visual = document.querySelector("#stage-visual");

function selectModule(name) {
  const data = modules[name];
  if (!data) return;
  tabs.forEach(tab => {
    const selected = tab.dataset.module === name;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  document.querySelector("#module-panel")?.setAttribute("aria-labelledby", `tab-${name}`);
  Object.entries(fields).forEach(([key, node]) => {
    if (!node || data[key] === undefined) return;
    if (!prefersReducedMotion && node.animate) node.animate([{ opacity: .4, transform: "translateY(3px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 260, easing: "ease-out" });
    if (key === "insight") { const marker = document.createElement("i"); marker.setAttribute("aria-hidden", "true"); node.replaceChildren(marker, document.createTextNode(data[key])); }
    else if (key === "decision") { const label = document.createElement("span"); label.textContent = "DECISION"; const statement = document.createElement("b"); statement.textContent = data[key]; node.replaceChildren(label, statement); }
    else if (key === "metricA" || key === "metricB") countTo(node, data[key]);
    else node.textContent = data[key];
  });
  visual.dataset.mode = name;
  if (!prefersReducedMotion && visual?.animate) visual.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectModule(tab.dataset.module));
  tab.addEventListener("keydown", event => {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const direction = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    next.focus();
    selectModule(next.dataset.module);
  });
});

/* ===== v12 · Scenario Studio — transparent, consistent what-if maths ===== */
(() => {
  const studio = document.querySelector('[data-scenario-studio]');
  if (!studio) return;

  const MODEL = Object.freeze({ baselineDaily: 60, onHand: 660, leadDays: 8, safetyDays: 5, targetDays: 13, scheduledInbound: 780 });
  const defs = {
    promo: { initial: 20, min: 5, max: 35, prefix: '+', suffix: '%', name: 'Demand Uplift', tagId: 's1-promo-tag', note: 'Assumes the uplift applies to future demand; other inputs remain unchanged.' },
    price: { initial: 15, min: 5, max: 25, prefix: '−', suffix: '%', name: 'Price Decrease', tagId: 's1-price-tag', note: 'Assumption: a 1% price cut produces a 1% demand increase (elasticity = −1).' },
    delay: { initial: 10, min: 1, max: 14, prefix: '+', suffix: 'd', name: 'Supplier Delay', tagId: 's1-delay-tag', note: 'A sample 780-unit inbound shipment was expected on day 8. Delaying it shifts arrival, not customer demand.' }
  };
  const el = (id) => studio.querySelector('#' + id);
  const presetButtons = [...studio.querySelectorAll('[data-scenario]')];
  const slider = el('ss-assumption');
  const values = { promo: defs.promo.initial, price: defs.price.initial, delay: defs.delay.initial };
  let mode = 'promo';

  const format = n => Number.isInteger(n) ? String(n) : n.toFixed(1);
  const sign = (n) => n > 0 ? '+' : n < 0 ? '−' : '';

  function set(id, text) { const node = el(id); if (node) node.textContent = text; }

  function syncShared(summary) {
    const data = modules.scenario;
    Object.assign(data, { range: summary.range, decision: summary.decision, title: 'Change one assumption. See the trade-offs.', metricALabel: summary.aLabel, metricA: summary.aValue, metricBLabel: summary.bLabel, metricB: summary.bValue, insight: summary.insight });
    const visual = document.querySelector('#stage-visual');
    if (visual?.dataset.mode === 'scenario') {
      for (const key of ['range','title','metricALabel','metricA','metricBLabel','metricB']) if (fields[key]) fields[key].textContent = data[key];
      if (fields.decision) { const label=document.createElement('span');label.textContent='DECISION';const b=document.createElement('b');b.textContent=data.decision; fields.decision.replaceChildren(label,b); }
      if (fields.insight) fields.insight.replaceChildren(document.createElement('i'),document.createTextNode(data.insight));
    }
  }

  function update() {
    const input = values[mode], d = defs[mode];
    studio.dataset.scenarioMode = mode;
    slider.min = d.min; slider.max = d.max; slider.value = input;
    const display = d.prefix + input + d.suffix;
    set('ss-assumption-name', d.name);
    set('ss-slider-val-display', display);
    set('ss-range-low', d.prefix + d.min + d.suffix + ' Min');
    set('ss-range-high', d.prefix + d.max + d.suffix + ' Max');
    set('ss-model-note', d.note);
    set(d.tagId, display);
    slider.style.setProperty('--ss-slider-progress', `${((input - d.min) / (d.max - d.min)) * 100}%`);

    for (const btn of presetButtons) {
      const active = btn.dataset.scenario === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    const simPath = el('s1-path-sim');
    const areaPath = el('s1-path-area');
    const markerDot = el('s1-marker-dot');
    const simLabel = el('s1-sim-label');
    const simBar = el('s1-sim-bar');
    const simBarText = el('s1-sim-bar-text');
    const bracketLine = el('s1-bracket-line');
    const gapRect = el('s1-gap-rect');
    const gapText = el('s1-gap-text');
    const riskBadge = el('ss-risk-badge');
    const outcomeHeadline = el('ss-outcome-headline');
    const recText = el('ss-recommendation');
    let summary;

    if (mode === 'delay') {
      const lead = MODEL.leadDays + input;
      const coverage = MODEL.onHand / MODEL.baselineDaily; // 11.0 days
      const gap = Math.max(0, lead - coverage); // 7.0 days
      const bridge = Math.ceil(gap * MODEL.baselineDaily); // 420 units

      if (simPath) simPath.setAttribute('d', 'M8 44 Q140 42 270 41 T532 38');
      if (areaPath) areaPath.setAttribute('d', 'M8 44 Q140 42 270 41 T532 38 Z');
      if (markerDot) markerDot.setAttribute('cy', '38');
      if (simLabel) simLabel.textContent = `Demand remains ${MODEL.baselineDaily} u/d (0% delta)`;

      // In delay mode, coverage stays at 11 days (324px), but delivery is delayed to Day ${lead}
      if (simBar) simBar.setAttribute('width', '324');
      if (simBarText) simBarText.textContent = `Warehouse Coverage: 11.0 Days (Depleted Day 11)`;
      if (bracketLine) {
        bracketLine.setAttribute('x1', '324');
        bracketLine.setAttribute('x2', '412');
      }
      if (gapRect) gapRect.setAttribute('x', '330');
      if (gapText) {
        gapText.setAttribute('x', '370');
        gapText.textContent = `STOCKOUT GAP: ${format(gap)}d (${bridge}u)`;
      }

      if (riskBadge) {
        riskBadge.className = 'viz-insight-badge tag-drop';
        riskBadge.textContent = `SUPPLY GAP: ${format(gap)} DAYS`;
      }
      if (outcomeHeadline) outcomeHeadline.textContent = `Inbound delivery delayed past warehouse depletion point.`;
      if (recText) recText.textContent = `Stock exhausts on Day 11. Arrival on Day ${lead} creates a ${format(gap)}-day stockout gap (~${bridge} units). Consider split-shipment expedite.`;

      summary = {
        range: 'SUPPLY TIMING SIMULATION · ILLUSTRATIVE',
        decision: 'Explore alternate supply timing before potential stockout exposure.',
        aLabel: 'DEMAND CHANGE', aValue: '0%',
        bLabel: 'SUPPLY GAP', bValue: `${format(gap)} days`,
        insight: `Delayed PO arrives on Day ${lead}; warehouse stock runs out on Day 11 (${format(gap)} days unserved).`
      };
    } else {
      const lift = input / 100;
      const daily = MODEL.baselineDaily * (1 + lift);
      const cover = MODEL.onHand / daily;
      const gapDays = MODEL.targetDays - cover;
      const gapUnits = Math.max(0, Math.ceil(MODEL.targetDays * daily - MODEL.onHand));

      // Calculate Track A SVG simulated curve
      const endY = (38 - lift * 56).toFixed(1);
      const midY = (36 - lift * 28).toFixed(1);
      const q1Y = (38 - lift * 28).toFixed(1);
      if (simPath) simPath.setAttribute('d', `M8 44 Q140 ${q1Y} 270 ${midY} T532 ${endY}`);
      if (areaPath) areaPath.setAttribute('d', `M8 44 Q140 ${q1Y} 270 ${midY} T532 ${endY} L532 38 Q270 41 140 42 T8 44 Z`);
      if (markerDot) markerDot.setAttribute('cy', endY);
      if (simLabel) simLabel.textContent = `Simulated: ${format(daily)} u/d (+${input}%)`;

      // Track B: simBar width proportional to coverage (16 days scale = 470px width, offset 28px)
      const barW = Math.max(20, Math.min(410, (cover / 16) * 470));
      if (simBar) simBar.setAttribute('width', barW.toFixed(1));
      if (simBarText) simBarText.textContent = `Simulated Coverage: ${format(cover)} Days (${format(daily)} u/d)`;

      // Bracket from simulated bar end (28 + barW) to 13d threshold datum (412)
      const startX = 28 + barW;
      if (bracketLine) {
        bracketLine.setAttribute('x1', startX.toFixed(1));
        bracketLine.setAttribute('x2', '412');
      }
      const gapMidX = startX + (412 - startX) / 2;
      if (gapRect) gapRect.setAttribute('x', (gapMidX - 40).toFixed(1));
      if (gapText) {
        gapText.setAttribute('x', gapMidX.toFixed(1));
        gapText.textContent = `−${format(gapDays)}d GAP (${gapUnits}u)`;
      }

      if (riskBadge) {
        riskBadge.className = 'viz-insight-badge tag-surge';
        riskBadge.textContent = `PLANNING GAP: ${gapUnits} UNITS`;
      }
      if (outcomeHeadline) outcomeHeadline.textContent = `Buffer falls ${format(gapDays)} days below target review threshold.`;
      if (recText) recText.textContent = `At ${format(daily)} u/day, 660 units covers ${format(cover)} days. Closing the deficit against the 13-day threshold requires an illustrative ~${gapUnits} additional units.`;

      summary = {
        range: '12-WEEK DEMAND SCENARIO · ILLUSTRATIVE',
        decision: mode === 'promo' ? 'Explore promotion-driven demand before changing replenishment.' : 'Explore an assumed price response before committing to a price change.',
        aLabel: 'DEMAND DELTA', aValue: `+${input}%`,
        bLabel: 'STOCK COVERAGE', bValue: `${format(cover)} days`,
        insight: `Review replenishment: about ${gapUnits} additional units reach the 13-day planning threshold under these assumptions.`
      };
    }
    syncShared(summary);
  }

  presetButtons.forEach(btn => btn.addEventListener('click', () => { mode = btn.dataset.scenario; update(); }));
  slider.addEventListener('input', () => { values[mode] = Number(slider.value); update(); });
  update();
})();

const toast = document.querySelector("[data-toast]");
if (toast) {
  const closeBtn = toast.querySelector("button");
  if (closeBtn) closeBtn.addEventListener("click", () => toast.classList.remove("show"));

  let toastShown = false;
  const triggerToast = () => {
    if (toastShown) return;
    toastShown = true;
    toast.classList.add("show");
    setTimeout(() => {
      if (toast.classList.contains("show")) toast.classList.remove("show");
    }, 6000);
  };

  const productSection = document.querySelector("#product");
  if (productSection && "IntersectionObserver" in window) {
    const toastObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        triggerToast();
        toastObserver.disconnect();
      }
    }, { threshold: 0.2 });
    toastObserver.observe(productSection);
  }
}

/* ===== Mobile navigation ===== */
(() => {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector("#mobile-menu");
  if (!toggle || !menu) return;

  const close = ({ returnFocus = false } = {}) => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    menu.hidden = true;
    document.body.classList.remove("menu-open");
    if (returnFocus) toggle.focus();
  };

  const open = () => {
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation");
    menu.hidden = false;
    document.body.classList.add("menu-open");
  };

  toggle.addEventListener("click", () => {
    toggle.getAttribute("aria-expanded") === "true" ? close() : open();
  });
  menu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => close()));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !menu.hidden) close({ returnFocus: true });
  });
  document.addEventListener("click", event => {
    if (!menu.hidden && !event.target.closest(".site-header")) close();
  });
  matchMedia("(min-width: 821px)").addEventListener("change", event => {
    if (event.matches) close();
  });
})();

/* ===== Hero v3 · Titan thread ===== */
(() => {
  const scene = document.querySelector("[data-thread]");
  if (!scene) return;
  const S = t => t * t * (3 - 2 * t);
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const X0 = 20, X1 = 720, XN = 400;
  const trend = x => {
    const t = (x - X0) / (X1 - X0);
    const amp = 16 * (1 - S(cl((t - .50) / .12)));
    return 410 - 270 * S(t) + amp * Math.sin(t * 11);
  };
  const path = (a, b, step = 6) => {
    let d = "";
    for (let x = a; x <= b; x += step) d += (d ? " L" : "M") + x.toFixed(1) + " " + trend(x).toFixed(1);
    return d + " L" + b + " " + trend(b).toFixed(1);
  };
  document.getElementById("thHistLine").setAttribute("d", path(X0, XN));
  document.getElementById("thFcLine").setAttribute("d", path(XN, X1));
  document.getElementById("thGlow").setAttribute("d", path(XN, X1));
  scene.querySelectorAll(".th-now, .th-now-ring").forEach(n => n.setAttribute("cy", trend(XN).toFixed(1)));
  [[520, ".th-node:not(.th-now):not(.th-risk):not(.th-end)"], [615, ".th-risk"], [720, ".th-end"]].forEach(([x, sel]) => {
    const n = scene.querySelector(sel); if (n) n.setAttribute("cy", trend(x).toFixed(1));
  });

  // Noisy sales points that collapse onto the forecast signal
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const g = document.getElementById("thDots"), NS = "http://www.w3.org/2000/svg", N = 132;
  for (let i = 0; i < N; i++) {
    const x = 24 + (i / (N - 1)) * 448, t = (x - X0) / (X1 - X0);
    const noise = 46 * (1 - S(cl((t - .28) / .32))) * ((rnd() + rnd() + rnd()) / 1.5 - 1);
    const y = trend(x) + noise;
    const c = document.createElementNS(NS, "circle");
    const warn = i === 41 || i === 77;
    c.setAttribute("class", "th-dot" + (warn ? " warn" : ""));
    c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1));
    c.setAttribute("r", (warn ? 4.2 : 1.7 + rnd() * 1.5).toFixed(1));
    c.style.opacity = (warn ? .9 : (.22 + rnd() * .38) * (1 - S(cl((x - 400) / 80)))).toFixed(2);
    c.style.setProperty("--dx", ((rnd() - .5) * 46).toFixed(0) + "px");
    c.style.setProperty("--dy", ((rnd() - .5) * 46).toFixed(0) + "px");
    c.style.setProperty("--delay", (0.15 + (i / N) * 0.9 + rnd() * .15).toFixed(2) + "s");
    g.appendChild(c);
  }

  // Gentle pointer parallax (fine pointers only)
  if (window.matchMedia("(pointer:fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const stage = scene.closest(".hero-stage");
    stage.addEventListener("pointermove", e => {
      const r = stage.getBoundingClientRect();
      scene.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      scene.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    stage.addEventListener("pointerleave", () => { scene.style.setProperty("--px", 0); scene.style.setProperty("--py", 0); });
  }
})();


/* ===== v4 · How it works (compare wipe) + A day inside (alert feed) ===== */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wipe = document.querySelector("[data-wipe]");
  if (wipe) {
    const range = wipe.querySelector(".wipe-range");
    let touched = false;
    const set = v => {
      wipe.style.setProperty("--pos", v + "%");
      range.value = v;
      range.setAttribute("aria-valuetext", Math.round(v) + "% of the spreadsheet view shown");
    };
    range.addEventListener("input", () => { touched = true; wipe.classList.add("touched"); set(+range.value); });
    if (!reduce) {
      new IntersectionObserver((es, ob) => {
        if (!es[0].isIntersecting) return;
        ob.disconnect();
        const t0 = performance.now(), from = 100, to = window.innerWidth < 700 ? 38 : 58, dur = 1500;
        const step = now => {
          if (touched) return;
          const p = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - p, 3);
          set(from + (to - from) * k);
          if (p < 1) requestAnimationFrame(step);
        };
        set(from); requestAnimationFrame(step);
      }, { threshold: 0.45 }).observe(wipe);
    }
  }


})();


/* ===== v5 · motion & storytelling ===== */
function countTo(el, text) {
  const m = text.match(/-?\d+(\.\d+)?/);
  if (!m || prefersReducedMotion) { el.textContent = text; return; }
  const end = parseFloat(m[0]), dec = m[1] ? m[1].length - 1 : 0, t0 = performance.now();
  cancelAnimationFrame(el._c);
  const f = now => {
    const p = Math.min(1, (now - t0) / 750), k = 1 - Math.pow(1 - p, 3);
    el.textContent = text.replace(m[0], (end * k).toFixed(dec));
    if (p < 1) el._c = requestAnimationFrame(f);
  };
  el._c = requestAnimationFrame(f);
}

function morph(el, to, dur = 650) {
  const num = /-?\d+(?:\.\d+)?/g;
  const from = el.getAttribute("d").match(num).map(Number), tgt = to.match(num).map(Number), tpl = to.split(num);
  if (prefersReducedMotion || from.length !== tgt.length) { el.setAttribute("d", to); return; }
  const t0 = performance.now();
  cancelAnimationFrame(el._r);
  const f = now => {
    const p = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - p, 3);
    el.setAttribute("d", tpl.reduce((s, seg, i) => s + seg + (i < tgt.length ? (from[i] + (tgt[i] - from[i]) * k).toFixed(1) : ""), ""));
    if (p < 1) el._r = requestAnimationFrame(f);
  };
  el._r = requestAnimationFrame(f);
}

(() => {
  // Hero headline: words rise out of a mask, one orchestrated entrance
  const h = document.querySelector(".hero h1");
  if (h && !prefersReducedMotion) {
    let i = 0;
    const wrap = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => {
          if (!w.trim()) return f.append(w);
          const o = document.createElement("span"), s = document.createElement("span");
          o.className = "w"; s.textContent = w; s.style.setProperty("--i", i++); o.append(s); f.append(o);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== "BR") wrap(c);
    });
    wrap(h);
  }

  // Scroll progress bar + active nav link
  const bar = document.querySelector(".progress");
  const setBar = () => bar && bar.style.setProperty("--p", (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(4));
  addEventListener("scroll", setBar, { passive: true }); setBar();
  const links = [...document.querySelectorAll(".nav-links a")];
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  links.forEach(a => { const s = document.querySelector(a.getAttribute("href")); if (s) navIO.observe(s); });

  // Product demo draws itself the first time it scrolls into view
  const shell = document.querySelector(".product-shell");
  if (shell) new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { shell.classList.add("seen"); ob.disconnect(); } }, { threshold: .35 }).observe(shell);


})();


/* ===== v6 · polish pass ===== */
(() => {
  const fine = matchMedia("(pointer:fine)").matches;

  // Split section headings into masked words (hero is handled earlier)
  if (!prefersReducedMotion) {
    document.querySelectorAll(".reveal h2").forEach(h => {
      let i = 0;
      const wrap = n => [...n.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(w => {
            if (!w.trim()) return f.append(w);
            const o = document.createElement("span"), s = document.createElement("span");
            o.className = "w"; s.textContent = w; s.style.setProperty("--i", i++); o.append(s); f.append(o);
          });
          c.replaceWith(f);
        } else if (c.nodeType === 1 && c.tagName !== "BR") wrap(c);
      });
      wrap(h);
    });
  }

  // Hero cursor glow
  const hero = document.querySelector(".hero");
  if (hero && fine && !prefersReducedMotion) {
    const g = document.createElement("div");
    g.className = "cursor-glow"; hero.prepend(g);
    let tx = 0, ty = 0, x = 0, y = 0, on = false;
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top;
      if (!on) { on = true; x = tx; y = ty; requestAnimationFrame(loop); }
    });
    const loop = () => {
      x += (tx - x) * .12; y += (ty - y) * .12;
      g.style.transform = `translate(${x}px, ${y}px)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > .5 || hero.matches(":hover")) requestAnimationFrame(loop); else on = false;
    };
  }

  // Magnetic buttons with rAF throttling
  if (fine && !prefersReducedMotion) {
    document.querySelectorAll(".button, .nav-cta").forEach(b => {
      let rafId = null;
      b.addEventListener("pointermove", e => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          const r = b.getBoundingClientRect();
          b.style.translate = `${((e.clientX - r.left) / r.width - .5) * 8}px ${((e.clientY - r.top) / r.height - .5) * 6}px`;
          rafId = null;
        });
      });
      b.addEventListener("pointerleave", () => {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        b.style.translate = "";
      });
    });
  }

  // Do not auto-switch product modes. Let the visitor control the story.
  // The showcase still animates on deliberate tab activation.
  const list = document.querySelector(".module-tabs");
  list?.classList.remove("cycling");

})();


/* ===== v13 · The Action Brief (The Decision Spotlight) ===== */
(() => {
  const brief = document.querySelector('[data-action-brief]');
  if (!brief) return;

  const whyToggle = brief.querySelector('#brief-why-toggle');
  const reasoningDrawer = brief.querySelector('#brief-reasoning-drawer');
  const inventoryLink = brief.querySelector('#brief-inventory-link');
  const toggleText = brief.querySelector('#spotlight-toggle-text');

  // 1. Expand / collapse transparent reasoning
  if (whyToggle && reasoningDrawer) {
    whyToggle.addEventListener('click', () => {
      const isExpanded = whyToggle.getAttribute('aria-expanded') === 'true';
      const nextState = !isExpanded;
      whyToggle.setAttribute('aria-expanded', String(nextState));
      reasoningDrawer.hidden = !nextState;
      reasoningDrawer.setAttribute('aria-hidden', String(!nextState));
      if (toggleText) {
        toggleText.textContent = nextState ? 'Hide Detailed Calculations ↑' : 'View Detailed Calculations ↓';
      }
    });
  }

  // 2. Safe navigation to verified inventory intelligence module
  if (inventoryLink) {
    inventoryLink.addEventListener('click', event => {
      event.preventDefault();
      if (typeof selectModule === 'function') {
        selectModule('inventory');
      }
      const target = document.querySelector('#product');
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        const invTab = document.querySelector('#tab-inventory');
        invTab?.focus();
      } else {
        window.location.hash = 'product';
      }
    });
  }

  // 3. Progressive reveal of variance caliper elements
  const caliperStock = brief.querySelector('.caliper-fill-stock');
  const caliperDeficit = brief.querySelector('.caliper-fill-deficit');
  const caliperPin = brief.querySelector('.caliper-datum-pin');

  if (caliperStock && caliperPin && !prefersReducedMotion && 'IntersectionObserver' in window) {
    caliperStock.style.width = '0%';
    caliperStock.style.transition = 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
    if (caliperDeficit) {
      caliperDeficit.style.opacity = '0';
      caliperDeficit.style.transition = 'opacity 0.4s ease';
    }
    caliperPin.style.opacity = '0';
    caliperPin.style.transition = 'opacity 0.4s ease';

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setTimeout(() => {
          caliperStock.style.width = '68.75%';
        }, 150);
        setTimeout(() => {
          caliperPin.style.opacity = '1';
        }, 550);
        setTimeout(() => {
          if (caliperDeficit) caliperDeficit.style.opacity = '0.9';
        }, 750);
        observer.disconnect();
      }
    }, { threshold: 0.2 });

    observer.observe(brief);
  }
})();


/* ===== v10 · Scene 02: Editorial Cause-and-Effect Story ===== */
(() => {
  const demo = document.querySelector('[data-chain-demo]');
  if (!demo) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Entrance reveal: bars initialize smoothly without disorienting autoplay timer cycling
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          demo.classList.add('chain-rendered');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    observer.observe(demo);
  } else {
    demo.classList.add('chain-rendered');
  }
})();


/* ===== v11 · Risk Radar signal investigation ===== */
(() => {
  const root = document.querySelector('[data-risk-lab]');
  if (!root) return;
  const cases = {
    steady: {
      badge: 'NORMAL OBSERVATION (+0.1σ)',
      badgeClass: 'tag-normal',
      metricA: '+0.1σ', metricB: '+2%',
      title: 'Demand is tracking within its usual baseline range (61 vs 60 u/d).',
      desc: 'A 1-unit deviation stays comfortably inside the ±2.0σ tolerance corridor. No urgent action is indicated.',
      insight: 'Day 08 stays within the expected corridor; a normal observation is not an anomaly.'
    },
    surge: {
      badge: 'STATISTICAL SURGE (+3.2σ)',
      badgeClass: 'tag-surge',
      metricA: '+3.2σ', metricB: '+48%',
      title: 'Demand is 48% above baseline (89 vs 60 u/d).',
      desc: 'Crossed the +2.0σ alert threshold by 11 units. Check wholesale channels and marketing campaigns; cause is unconfirmed.',
      insight: 'Day 14 is a significant illustrative surge worth investigating alongside available inventory.'
    },
    drop: {
      badge: 'DEMAND DROP (−2.4σ)',
      badgeClass: 'tag-drop',
      metricA: '−2.4σ', metricB: '−37%',
      title: 'Demand has dropped below usual pattern (38 vs 60 u/d).',
      desc: 'Breached the −2.0σ alert threshold by 4 units. Review stock availability, cart drops, and channel reporting.',
      insight: 'Day 23 is an illustrative demand drop; verify data quality and business context.'
    }
  };
  const buttons = [...root.querySelectorAll('[data-risk-event]')];
  const badge = root.querySelector('#risk-finding-badge');
  const title = root.querySelector('#risk-finding-title');
  const desc = root.querySelector('#risk-finding-desc');
  const rows = [...root.querySelectorAll('[data-risk-row]')];
  const stage = document.querySelector('#stage-visual');

  function setRiskEvent(key) {
    const value = cases[key];
    if (!value) return;
    root.dataset.riskFocus = key;
    buttons.forEach(button => {
      const active = button.dataset.riskEvent === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    rows.forEach(row => {
      row.classList.toggle('is-active', row.dataset.riskRow === key);
    });
    if (badge) {
      badge.className = `viz-insight-badge ${value.badgeClass}`;
      badge.textContent = value.badge;
    }
    if (title) title.textContent = value.title;
    if (desc) desc.textContent = value.desc;

    // Keep the shared, bottom-of-module summary consistent with the selected event.
    modules.risk.metricA = value.metricA;
    modules.risk.metricB = value.metricB;
    modules.risk.insight = value.insight;
    if (stage?.dataset.mode === 'risk') {
      if (fields.metricA) fields.metricA.textContent = value.metricA;
      if (fields.metricB) fields.metricB.textContent = value.metricB;
      if (fields.insight) {
        const marker = document.createElement('i');
        fields.insight.replaceChildren(marker, document.createTextNode(value.insight));
      }
    }
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => setRiskEvent(button.dataset.riskEvent));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const step = ['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1;
      const candidate = buttons[(index + buttons.length + step) % buttons.length];
      candidate.focus();
      setRiskEvent(candidate.dataset.riskEvent);
    });
  });
  setRiskEvent('surge');
})();
