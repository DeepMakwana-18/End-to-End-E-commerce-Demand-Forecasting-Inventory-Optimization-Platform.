const modules = {
  forecast: {
    kicker: "Demand forecast intelligence",
    range: "HORIZON: 12 WEEKS · CONFIDENCE: 95%",
    question: "What demand is coming?",
    decision: "Forecast volume 12 weeks out with confidence bands to schedule POs ahead of supplier lead times.",
    title: "Demand is forecast to peak in week 10.",
    metricA: "±6.4%",
    metricALabel: "CONFIDENCE BAND",
    metricBLabel: "PROJECTED PEAK",
    metricB: "+18.4%",
    insight: "Peak reaches 1,840 units in Week 10 (+18.4% above 1,554-unit baseline). Upper 95% bound warrants +240 safety stock buffer."
  },
  inventory: {
    kicker: "Inventory health & replenishment",
    range: "COVERAGE TRACKER · SAFETY BUFFER WATCH",
    question: "Which products need replenishment?",
    decision: "Identify SKUs nearing stock thresholds and review suggested reorder quantities.",
    title: "SKU-204 requires replenishment within 3 days.",
    metricA: "11 Days",
    metricALabel: "CURRENT COVERAGE",
    metricBLabel: "RECOMMENDED PO",
    metricB: "320 Units",
    insight: "On-hand stock covers 11 days (660u at 60 u/d). Order 320 units within 3 days to protect an 8-day supplier lead time."
  },
  risk: {
    kicker: "Anomaly detection & risk radar",
    range: "ILLUSTRATIVE DATA · THREE SIGNALS TO EXPLORE",
    question: "What changed unexpectedly?",
    decision: "Select an observed change, review the evidence, and decide what deserves investigation.",
    title: "Day 14 demand was 48% above baseline.",
    metricA: "+3.2σ",
    metricALabel: "ANOMALY SEVERITY",
    metricBLabel: "OBSERVED VS EXPECTED",
    metricB: "89 vs 60 u/d",
    insight: "Day 14 observed demand (89 units) exceeded 60 u/day baseline by +3.2σ (+29 units). Investigate promotional channels."
  },
  scenario: {
    kicker: "Scenario lab & what-if engine",
    range: "12-WEEK DEMAND SCENARIO · ILLUSTRATIVE",
    question: "What happens if assumptions change?",
    decision: "Explore promotion-driven demand before changing replenishment.",
    title: "A 20% demand increase reduces stock cover to 9.2 days.",
    metricA: "+20%",
    metricALabel: "DEMAND UPLIFT",
    metricBLabel: "SIMULATED COVER",
    metricB: "9.2 days",
    insight: "At 72 u/day simulated demand, 660 units covers 9.2 days. 276 additional units would restore 13 days of cover."
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
document.getElementById("top")?.classList.add("hero-js-ready");

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

let scrollTicking = false;
const handleScroll = () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      updateHeader();
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
  if (visual) visual.dataset.mode = name;
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

/* Connect Overview 4-question cards to Explore Intelligence modules */
document.querySelectorAll("[data-goto-module]").forEach(card => {
  const navigate = () => {
    const mod = card.dataset.gotoModule;
    if (!mod) return;
    selectModule(mod);
    const targetSection = document.getElementById("product");
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      const targetTab = document.getElementById(`tab-${mod}`);
      if (targetTab) targetTab.focus();
    }
  };
  card.addEventListener("click", navigate);
  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate();
    }
  });
});

/* ===== v12 · Scenario Studio — transparent, consistent what-if maths ===== */
(() => {
  const studio = document.querySelector('[data-scenario-studio]');
  if (!studio) return;

  const MODEL = Object.freeze({ baselineDaily: 60, onHand: 660, leadDays: 8, targetDays: 13, targetUnits: 780 });
  const defs = {
    promo: { initial: 20, min: 5, max: 35, prefix: '+', suffix: '%', name: 'PROMOTION UPLIFT', tagId: 's1-promo-tag', note: 'Assumes the uplift applies to future demand; baseline daily sales remain 60 u/d.' },
    price: { initial: 15, min: 5, max: 25, prefix: '−', suffix: '%', name: 'PRICE ADJUSTMENT', tagId: 's1-price-tag', note: 'Assumes unit-elastic demand (elasticity = −1): a 1% price cut produces a 1% demand increase.' },
    delay: { initial: 10, min: 1, max: 14, prefix: '+', suffix: 'd', name: 'SUPPLIER TRANSIT SLIP', tagId: 's1-delay-tag', note: 'Scheduled 780-unit inbound shipment was planned for Day 8. Delay shifts arrival date, not consumption rate.' }
  };
  const el = (id) => studio.querySelector('#' + id);
  const presetButtons = [...studio.querySelectorAll('[data-scenario]')];
  const slider = el('ss-assumption');
  const resetBtn = el('ss-reset-btn');
  const values = { promo: defs.promo.initial, price: defs.price.initial, delay: defs.delay.initial };
  let mode = 'promo';

  const format = n => Number.isInteger(n) ? String(n) : n.toFixed(1);

  function set(id, text) { const node = el(id); if (node) node.textContent = text; }

  function syncShared(summary) {
    const data = modules.scenario;
    const dynamicTitle = mode === 'delay'
      ? `Supplier delay leaves ${format(summary.gap)} days unserved exposure.`
      : `At ${values[mode] > 0 ? '+' : ''}${values[mode]}% demand, stock cover falls to ${format(summary.cover)} days.`;
    Object.assign(data, { range: summary.range, decision: summary.decision, title: dynamicTitle, metricALabel: summary.aLabel, metricA: summary.aValue, metricBLabel: summary.bLabel, metricB: summary.bValue, insight: summary.insight });
    const visual = document.querySelector('#stage-visual');
    if (visual?.dataset.mode === 'scenario') {
      for (const key of ['range', 'title', 'metricALabel', 'metricA', 'metricBLabel', 'metricB']) if (fields[key]) fields[key].textContent = data[key];
      if (fields.decision) { const label = document.createElement('span'); label.textContent = 'DECISION'; const b = document.createElement('b'); b.textContent = data.decision; fields.decision.replaceChildren(label, b); }
      if (fields.insight) fields.insight.replaceChildren(document.createElement('i'), document.createTextNode(data.insight));
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
    set(d.tagId, display + (mode === 'delay' ? ' Slip' : (mode === 'price' ? ' Price' : ' Demand')));
    slider.style.setProperty('--ss-slider-progress', `${((input - d.min) / (d.max - d.min)) * 100}%`);

    for (const btn of presetButtons) {
      const active = btn.dataset.scenario === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    const vizBars = el('scVizBars');
    const vizTimeline = el('scVizTimeline');
    const scOutcomeTitle = el('scOutcomeTitle');
    const riskBadge = el('ss-risk-badge');
    const metaALbl = el('scMetaALbl');
    const metaAVal = el('scMetaAVal');
    const metaBLbl = el('scMetaBLbl');
    const metaBVal = el('scMetaBVal');
    const metaCLbl = el('scMetaCLbl');
    const metaCVal = el('scMetaCVal');
    const recText = el('ss-recommendation');
    let summary;

    if (mode === 'delay') {
      if (vizBars) vizBars.hidden = true;
      if (vizTimeline) vizTimeline.hidden = false;
      if (scOutcomeTitle) scOutcomeTitle.textContent = 'SUPPLY ARRIVAL TIMELINE & UNCOVERED EXPOSURE';

      const lead = MODEL.leadDays + input; // 8 + delay
      const coverage = MODEL.onHand / MODEL.baselineDaily; // 11.0 days
      const gap = Math.max(0, lead - coverage); // days unserved
      const shortfallUnits = Math.ceil(gap * MODEL.baselineDaily);

      // Timeline positions: scale 22px per day from x: 40px
      // Day 11 (depletion): 40 + 11*22 = 282px
      // Day lead (delayed arrival): 40 + lead*22 px
      const delayedX = Math.min(480, 40 + lead * 22);
      const intervalW = Math.max(10, delayedX - 282);

      const delayRect = el('scDelayIntervalRect');
      const delayText = el('scDelayIntervalText');
      const delayedNode = el('scDelayedArrivalNode');
      const delayedNodeLabel = el('scDelayedNodeLabel');
      const delayedNodeSub = el('scDelayedNodeSub');

      if (delayRect) {
        delayRect.setAttribute('x', '282');
        delayRect.setAttribute('width', String(intervalW));
      }
      if (delayText) {
        delayText.setAttribute('x', String(282 + intervalW / 2));
        delayText.textContent = `${format(gap)}-DAY UNCOVERED EXPOSURE (${shortfallUnits}u)`;
      }
      if (delayedNode) delayedNode.setAttribute('transform', `translate(${delayedX}, 60)`);
      if (delayedNodeLabel) delayedNodeLabel.textContent = `Delayed PO (Day ${lead})`;
      if (delayedNodeSub) delayedNodeSub.textContent = `+${input}d Slip`;

      if (riskBadge) {
        riskBadge.className = 'sc-outcome-badge tag-drop';
        riskBadge.textContent = `EXPOSURE: ${format(gap)} DAYS (${shortfallUnits}u)`;
      }
      if (metaALbl) metaALbl.textContent = 'DEPLETION DATE';
      if (metaAVal) metaAVal.textContent = 'Day 11 (660u)';
      if (metaBLbl) metaBLbl.textContent = 'INBOUND ARRIVAL';
      if (metaBVal) {
        metaBVal.className = 'sc-m-val tag-drop-val';
        metaBVal.textContent = `Day ${lead} (+${input}d)`;
      }
      if (metaCLbl) metaCLbl.textContent = 'UNSERVED GAP';
      if (metaCVal) {
        metaCVal.className = 'sc-m-val tag-drop-val';
        metaCVal.textContent = `${format(gap)} days (${shortfallUnits}u)`;
      }
      if (recText) {
        recText.textContent = `Stock runs out on Day 11. Delivery delayed to Day ${lead} creates a ${format(gap)}-day stockout window (~${shortfallUnits} units unserved). Consider split-shipment expedite or safety transfer.`;
      }

      summary = {
        range: 'SUPPLY TIMING SIMULATION · ILLUSTRATIVE',
        decision: 'Explore alternate supply timing before potential stockout exposure.',
        aLabel: 'DEMAND RATE', aValue: '60 u/d',
        bLabel: 'SUPPLY GAP', bValue: `${format(gap)} days`,
        gap: gap,
        cover: coverage,
        insight: `Delayed PO arrives on Day ${lead}; warehouse stock exhausts on Day 11 (${format(gap)} days unserved).`
      };
    } else {
      if (vizBars) vizBars.hidden = false;
      if (vizTimeline) vizTimeline.hidden = true;
      if (scOutcomeTitle) scOutcomeTitle.textContent = 'STOCK COVERAGE & SHORTFALL ANALYSIS';

      const lift = input / 100;
      const daily = MODEL.baselineDaily * (1 + lift); // e.g. 72 u/d
      const cover = MODEL.onHand / daily; // e.g. 660 / 72 = 9.167 days
      const gapDays = MODEL.targetDays - cover; // e.g. 13 - 9.167 = 3.833 days
      const gapUnits = Math.max(0, Math.ceil(MODEL.targetDays * daily - MODEL.onHand)); // 13 * 72 - 660 = 276 units

      // Days scale: 0 to 16 days across 440px (from x=40 to 480) -> 27.5px per day
      // 13d threshold = 40 + 13 * 27.5 = 397.5px
      const barW = Math.max(20, Math.min(397, cover * 27.5));
      const simBar = el('scSimBar');
      const simBarText = el('scSimBarText');
      const bracketLine = el('scBracketLine');
      const gapPill = el('scGapPill');
      const gapRect = el('scGapRect');
      const gapText = el('scGapText');

      if (simBar) simBar.setAttribute('width', barW.toFixed(1));
      if (simBarText) simBarText.textContent = `Simulated Cover: ${format(cover)} Days (${format(daily)} u/d)`;

      const startX = 40 + barW;
      if (bracketLine) {
        bracketLine.setAttribute('x1', startX.toFixed(1));
        bracketLine.setAttribute('x2', '397.5');
      }
      const midX = startX + (397.5 - startX) / 2;
      if (gapPill) gapPill.setAttribute('transform', `translate(${midX.toFixed(1)}, 59)`);
      if (gapText) gapText.textContent = `−${format(gapDays)}d GAP (${gapUnits}u)`;

      if (riskBadge) {
        riskBadge.className = 'sc-outcome-badge tag-surge';
        riskBadge.textContent = `GAP: ${gapUnits} UNITS`;
      }
      if (metaALbl) metaALbl.textContent = 'SIMULATED DEMAND';
      if (metaAVal) metaAVal.textContent = `${format(daily)} u/d`;
      if (metaBLbl) metaBLbl.textContent = 'PROJECTED RUNWAY';
      if (metaBVal) {
        metaBVal.className = 'sc-m-val tag-surge-val';
        metaBVal.textContent = `${format(cover)} days`;
      }
      if (metaCLbl) metaCLbl.textContent = 'SHORTFALL TO 13d';
      if (metaCVal) {
        metaCVal.className = 'sc-m-val tag-surge-val';
        metaCVal.textContent = `${gapUnits} units (${format(gapDays)}d)`;
      }
      if (recText) {
        recText.textContent = `At ${format(daily)} u/day simulated demand, 660 units covers ${format(cover)} days. Restoring safety runway to the 13-day target threshold requires an additional ${gapUnits} units.`;
      }

      summary = {
        range: '12-WEEK DEMAND SCENARIO · ILLUSTRATIVE',
        decision: mode === 'promo' ? 'Explore promotion-driven demand before changing replenishment.' : 'Explore price-elastic demand sensitivity before committing changes.',
        aLabel: 'DEMAND DELTA', aValue: `+${input}%`,
        bLabel: 'STOCK COVERAGE', bValue: `${format(cover)} days`,
        cover: cover,
        gap: gapDays,
        insight: `Review replenishment: about ${gapUnits} additional units reach the 13-day planning threshold under these assumptions.`
      };
    }
    syncShared(summary);
  }

  presetButtons.forEach(btn => btn.addEventListener('click', () => { mode = btn.dataset.scenario; update(); }));
  slider.addEventListener('input', () => { values[mode] = Number(slider.value); update(); });
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      values[mode] = defs[mode].initial;
      update();
    });
  }
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
  const hero = scene.closest("#top");
  const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  // Set historical line, base stationary curve, and trace overlay along identical geometry
  document.getElementById("thHistLine")?.setAttribute("d", path(X0, XN));
  document.getElementById("thHistPulse")?.setAttribute("d", path(X0, XN));
  document.getElementById("thFcBase")?.setAttribute("d", path(XN, X1));
  document.getElementById("thFcLine")?.setAttribute("d", path(XN, X1));

  // Construct bounded confidence interval envelope for the forecast line
  const ciArea = document.getElementById("thCiArea");
  if (ciArea) {
    let topD = "", btmD = "";
    for (let x = XN; x <= X1; x += 8) {
      const t = (x - XN) / (X1 - XN);
      const spread = 28 * Math.sqrt(t);
      const y = trend(x);
      topD += (topD ? " L" : "M") + x.toFixed(1) + " " + (y - spread).toFixed(1);
      btmD = " L" + x.toFixed(1) + " " + (y + spread).toFixed(1) + btmD;
    }
    ciArea.setAttribute("d", topD + btmD + " Z");
  }

  // Anchor markers and halos to their exact data coordinates
  const yNow = trend(XN).toFixed(1);
  const yDemand = trend(520).toFixed(1);
  const yRisk = trend(615).toFixed(1);
  const yEnd = trend(720).toFixed(1);

  scene.querySelector(".th-now")?.setAttribute("cy", yNow);
  scene.querySelectorAll("#thHaloDemand, #thNodeDemand, #thHitDemand").forEach(n => n.setAttribute("cy", yDemand));
  scene.querySelector(".th-risk")?.setAttribute("cy", yRisk);
  scene.querySelector(".th-end")?.setAttribute("cy", yEnd);

  // Set leader lines accurately connecting annotations to data points
  const updateAnchors = () => {
    const linkDemand = document.getElementById("thLinkDemand");
    if (linkDemand) {
      linkDemand.setAttribute("x1", "475");
      linkDemand.setAttribute("y1", "138");
      linkDemand.setAttribute("x2", "516");
      linkDemand.setAttribute("y2", (parseFloat(yDemand) - 6.5).toFixed(1));
    }
    const linkRisk = document.getElementById("thLinkRisk");
    if (linkRisk) {
      linkRisk.setAttribute("x1", "615");
      linkRisk.setAttribute("y1", (parseFloat(yRisk) + 7.5).toFixed(1));
      linkRisk.setAttribute("x2", "600");
      linkRisk.setAttribute("y2", "245");
    }
    const linkAction = document.getElementById("thLinkAction");
    if (linkAction) {
      linkAction.setAttribute("x1", "695");
      linkAction.setAttribute("y1", "78");
      linkAction.setAttribute("x2", "716");
      linkAction.setAttribute("y2", (parseFloat(yEnd) - 7).toFixed(1));
    }
  };
  updateAnchors();
  window.addEventListener("resize", updateAnchors, { passive: true });

  // Uniform historical sales data points along the trend
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const g = document.getElementById("thDots"), NS = "http://www.w3.org/2000/svg", N = 120;
  if (g && g.children.length === 0) {
    for (let i = 0; i < N; i++) {
      const x = 24 + (i / (N - 1)) * 448;
      const t = (x - X0) / (X1 - X0);
      const noise = 44 * (1 - S(cl((t - .28) / .32))) * ((rnd() + rnd() + rnd()) / 1.5 - 1);
      const y = trend(x) + noise;
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "th-dot");
      c.setAttribute("cx", x.toFixed(1));
      c.setAttribute("cy", y.toFixed(1));
      c.setAttribute("r", (1.6 + rnd() * 1.4).toFixed(1));
      const op = ((0.24 + rnd() * 0.36) * (1 - S(cl((x - 400) / 80)))).toFixed(2);
      c.style.opacity = op;
      c.style.setProperty("--delay", (0.02 + (i / N) * 0.22).toFixed(2) + "s");
      g.appendChild(c);
    }
  }

  // Authoritative Sequence Controller: "Watch the forecast emerge" (0–1,350ms)
  const replayBtn = document.getElementById("thReplayBtn");
  let currentMotionAllowed = motionAllowed;

  const sequenceController = {
    state: "idle", // 'idle' | 'playing' | 'settled'
    timer: null,

    play() {
      if (this.state === "playing" || !currentMotionAllowed) return;
      this.state = "playing";
      if (replayBtn) {
        replayBtn.setAttribute("disabled", "true");
        replayBtn.classList.add("is-disabled");
      }

      // Re-trigger decorative sequence cleanly without DOM insertion
      scene.dataset.sequence = "idle";
      void scene.offsetWidth; // Force synchronous reflow
      scene.dataset.sequence = "playing";

      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.settle();
      }, 1400);
    },

    settle() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.state = "settled";
      scene.dataset.sequence = "settled";
      if (replayBtn) {
        replayBtn.removeAttribute("disabled");
        replayBtn.classList.remove("is-disabled");
      }
    }
  };

  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      if (sequenceController.state === "playing") return;
      sequenceController.play();
    });
  }

  // Authoritative Demand hover state with hit corridor and grace period for zero-flicker transitions
  const chipDemand = scene.querySelector(".chip-demand");
  const nodeDemand = document.getElementById("thNodeDemand");
  const haloDemand = document.getElementById("thHaloDemand");
  const hitDemand = document.getElementById("thHitDemand");
  const bridgeDemand = document.getElementById("thBridgeDemand");

  let demandActive = false;
  let deactivateTimer = null;

  const setDemandActive = (active) => {
    if (active) {
      // If user interacts during intro sequence, settle decorative sequence immediately
      if (sequenceController.state === "playing") {
        sequenceController.settle();
      }
      if (deactivateTimer) {
        clearTimeout(deactivateTimer);
        deactivateTimer = null;
      }
      if (demandActive) return;
      demandActive = true;
      chipDemand?.classList.add("is-active");
      nodeDemand?.classList.add("is-active");
      haloDemand?.classList.add("is-active");
      hitDemand?.setAttribute("aria-pressed", "true");
    } else {
      if (deactivateTimer) clearTimeout(deactivateTimer);
      deactivateTimer = setTimeout(() => {
        demandActive = false;
        chipDemand?.classList.remove("is-active");
        nodeDemand?.classList.remove("is-active");
        haloDemand?.classList.remove("is-active");
        hitDemand?.setAttribute("aria-pressed", "false");
        deactivateTimer = null;
      }, 140);
    }
  };

  const interactiveElements = [chipDemand, hitDemand, bridgeDemand].filter(Boolean);
  interactiveElements.forEach(el => {
    el.addEventListener("pointerenter", () => setDemandActive(true));
    el.addEventListener("pointerleave", () => setDemandActive(false));
  });

  if (chipDemand) {
    chipDemand.addEventListener("focus", () => setDemandActive(true));
    chipDemand.addEventListener("blur", () => setDemandActive(false));
    chipDemand.addEventListener("click", () => setDemandActive(!demandActive));
  }

  if (hitDemand) {
    hitDemand.addEventListener("focus", () => setDemandActive(true));
    hitDemand.addEventListener("blur", () => setDemandActive(false));
    hitDemand.addEventListener("click", (e) => {
      e.preventDefault();
      setDemandActive(!demandActive);
    });
    hitDemand.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setDemandActive(!demandActive);
      }
    });
  }

  // Handle prefers-reduced-motion dynamic preference changes
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
    currentMotionAllowed = !e.matches;
    if (!currentMotionAllowed) {
      sequenceController.settle();
    }
  });

  // Lifecycle: play once on initial view, cancel/settle if offscreen or hidden, stay settled on return
  if (hero && "IntersectionObserver" in window) {
    let heroVisible = false;
    let hasPlayedInitial = false;

    const handleVisibility = () => {
      if (document.hidden || !heroVisible) {
        if (sequenceController.state === "playing") {
          sequenceController.settle();
        }
      } else if (!hasPlayedInitial && currentMotionAllowed) {
        hasPlayedInitial = true;
        sequenceController.play();
      }
    };

    const visibilityObserver = new IntersectionObserver(entries => {
      heroVisible = Boolean(entries[0]?.isIntersecting);
      handleVisibility();
    }, { threshold: 0.15 });

    visibilityObserver.observe(hero);
    document.addEventListener("visibilitychange", handleVisibility);
  } else if (currentMotionAllowed) {
    sequenceController.play();
  } else {
    sequenceController.settle();
  }
})();


/* ===== v4 · How it works (compare wipe) + A day inside (alert feed) ===== */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wipe = document.querySelector("[data-wipe]");
  if (wipe) {
    const range = wipe.querySelector(".wipe-range");
    let touched = false;
    let isDragging = false;

    const set = v => {
      const clamped = Math.max(0, Math.min(100, v));
      wipe.style.setProperty("--pos", clamped.toFixed(1) + "%");
      if (range) {
        range.value = clamped;
        range.setAttribute("aria-valuetext", Math.round(clamped) + "% of the spreadsheet view shown");
      }
    };

    // Keyboard navigation & direct input event on range input
    if (range) {
      range.addEventListener("input", () => {
        touched = true;
        wipe.classList.add("touched");
        set(+range.value);
      });
      range.addEventListener("change", () => {
        touched = true;
        wipe.classList.add("touched");
        set(+range.value);
      });
    }

    // Direct pointer drag on the entire .wipe container and handle
    const updateFromPointer = clientX => {
      const rect = wipe.getBoundingClientRect();
      if (!rect.width) return;
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const pct = (x / rect.width) * 100;
      set(pct);
    };

    wipe.addEventListener("pointerdown", e => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      isDragging = true;
      touched = true;
      wipe.classList.add("touched", "is-dragging");
      try {
        wipe.setPointerCapture(e.pointerId);
      } catch (_) { }
      updateFromPointer(e.clientX);
    });

    wipe.addEventListener("pointermove", e => {
      if (!isDragging) return;
      updateFromPointer(e.clientX);
    });

    const stopDragging = e => {
      if (!isDragging) return;
      isDragging = false;
      wipe.classList.remove("is-dragging");
      try {
        wipe.releasePointerCapture(e.pointerId);
      } catch (_) { }
    };

    wipe.addEventListener("pointerup", stopDragging);
    wipe.addEventListener("pointercancel", stopDragging);

    // Initial entrance wipe motion
    if (!reduce) {
      new IntersectionObserver((es, ob) => {
        if (!es[0].isIntersecting) return;
        ob.disconnect();
        const t0 = performance.now();
        const from = 100;
        const to = window.innerWidth < 700 ? 38 : 58;
        const dur = 1500;
        const step = now => {
          if (touched) return;
          const p = Math.min(1, (now - t0) / dur);
          const k = 1 - Math.pow(1 - p, 3);
          set(from + (to - from) * k);
          if (p < 1) requestAnimationFrame(step);
        };
        set(from);
        requestAnimationFrame(step);
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
  const updateActiveNav = () => {
    // If user is near top (hero view), no sub-section is active
    if (window.scrollY < 300) {
      links.forEach(a => a.classList.remove("active"));
      return;
    }
    const scrollPos = window.scrollY + 160;
    let currentId = null;
    links.forEach(a => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        const top = target.offsetTop;
        const height = target.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentId = target.id;
        }
      }
    });
    links.forEach(a => a.classList.toggle("active", Boolean(currentId && a.getAttribute("href") === "#" + currentId)));
  };
  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();

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


/* ===== v11 · Risk Radar signal investigation ===== */
(() => {
  const root = document.querySelector('[data-risk-lab]');
  if (!root) return;
  const cases = {
    steady: {
      badge: 'NORMAL OBSERVATION (+0.1σ)',
      badgeClass: 'tag-normal',
      dayLabel: 'Day 08 Observation',
      title: 'Demand is tracking within its expected tolerance range.',
      obs: '61 u/d',
      delta: '+1 u (+0.1σ)',
      deltaClass: '',
      stat: 'Observation is within 1 unit of the 60 u/d baseline, safely inside the ±2.0σ tolerance envelope (42–78 u/d).',
      action: 'Demand matches predictable customer consumption patterns. No replenishment intervention or inventory buffer modification needed.',
      x: 159, y: 95, stemLen: 70, deltaLen: 1, calloutText: '61 u (+0.1σ)',
      metricA: '+0.1σ', metricB: '+2%',
      insight: 'Day 08 stays within the expected corridor; a normal observation is not an anomaly.'
    },
    surge: {
      badge: 'STATISTICAL SURGE (+3.2σ)',
      badgeClass: 'tag-surge',
      dayLabel: 'Day 14 Observation',
      title: 'Day 14 demand was 48% above baseline (89 vs 60 u/d).',
      obs: '89 u/d',
      delta: '+29 u (+3.2σ)',
      deltaClass: 'tag-surge-val',
      stat: 'Crossed the +2.0σ upper alert threshold (78 units) by 11 units. Deviation severity is statistically significant (σ = 9.0u).',
      action: 'Check promotional marketing activations, wholesale replenishment orders, or bulk buyer intake before treating this as permanent baseline growth.',
      x: 257, y: 63, stemLen: 102, deltaLen: 33, calloutText: '89 u (+3.2σ)',
      metricA: '+3.2σ', metricB: '+48%',
      insight: 'Day 14 is a significant illustrative surge worth investigating alongside available inventory.'
    },
    drop: {
      badge: 'DEMAND DROP (−2.4σ)',
      badgeClass: 'tag-drop',
      dayLabel: 'Day 23 Observation',
      title: 'Day 23 demand dropped 37% below baseline (38 vs 60 u/d).',
      obs: '38 u/d',
      delta: '−22 u (−2.4σ)',
      deltaClass: 'tag-drop-val',
      stat: 'Breached the −2.0σ lower alert boundary (42 units) by 4 units. Sustained drops degrade warehouse turn efficiency.',
      action: 'Check e-commerce checkout telemetry, stock availability outages, distributor inventory delays, or channel feed errors before revising forecast.',
      x: 405, y: 122, stemLen: 43, deltaLen: 26, calloutText: '38 u (−2.4σ)',
      metricA: '−2.4σ', metricB: '−37%',
      insight: 'Day 23 is an illustrative demand drop; verify data quality and checkout channel telemetry.'
    }
  };

  const buttons = [...root.querySelectorAll('[data-risk-event]')];
  const badge = root.querySelector('#rtFindingBadge');
  const dayPill = root.querySelector('#rtDayPill');
  const headline = root.querySelector('#rtFindingHeadline');
  const obsVal = root.querySelector('#rtObsVal');
  const deltaVal = root.querySelector('#rtDeltaVal');
  const statDesc = root.querySelector('#rtStatDesc');
  const actionDesc = root.querySelector('#rtActionDesc');

  // SVG Marker elements
  const markerGroup = root.querySelector('#rtMarkerGroup');
  const guideStem = root.querySelector('#rtGuideStem');
  const deltaStem = root.querySelector('#rtDeltaStem');
  const markerHalo = root.querySelector('#rtMarkerHalo');
  const markerDot = root.querySelector('#rtMarkerDot');
  const calloutBg = root.querySelector('#rtCalloutBg');
  const calloutText = root.querySelector('#rtCalloutText');
  const stage = document.querySelector('#stage-visual');

  function setRiskEvent(key) {
    const d = cases[key];
    if (!d) return;
    root.dataset.riskFocus = key;

    buttons.forEach(btn => {
      const active = btn.dataset.riskEvent === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    if (badge) {
      badge.className = `rt-finding-badge ${d.badgeClass}`;
      badge.textContent = d.badge;
    }
    if (dayPill) dayPill.textContent = d.dayLabel;
    if (headline) headline.textContent = d.title;
    if (obsVal) obsVal.textContent = d.obs;
    if (deltaVal) {
      deltaVal.className = `rt-m-val ${d.deltaClass}`;
      deltaVal.textContent = d.delta;
    }
    if (statDesc) statDesc.textContent = d.stat;
    if (actionDesc) actionDesc.textContent = d.action;

    // Reposition SVG interactive elements
    if (markerGroup) {
      markerGroup.setAttribute('transform', `translate(${d.x}, ${d.y})`);
      if (guideStem) guideStem.setAttribute('y2', d.stemLen);
      if (deltaStem) {
        if (key === 'drop') {
          deltaStem.setAttribute('y1', '0');
          deltaStem.setAttribute('y2', '-26');
        } else {
          deltaStem.setAttribute('y1', '0');
          deltaStem.setAttribute('y2', String(d.deltaLen));
        }
      }
      if (markerHalo) {
        markerHalo.className.baseVal = `rt-marker-halo ${d.badgeClass}-halo`;
      }
      if (markerDot) {
        markerDot.className.baseVal = `rt-marker-dot ${d.badgeClass}-dot`;
      }
      if (calloutBg) {
        calloutBg.className.baseVal = `rt-callout-bg ${d.badgeClass}-bg`;
      }
      if (calloutText) {
        calloutText.textContent = d.calloutText;
      }
    }

    // Update shared footer
    modules.risk.metricA = d.metricA;
    modules.risk.metricB = d.metricB;
    modules.risk.insight = d.insight;
    if (stage?.dataset.mode === 'risk') {
      if (fields.metricA) fields.metricA.textContent = d.metricA;
      if (fields.metricB) fields.metricB.textContent = d.metricB;
      if (fields.insight) {
        const marker = document.createElement('i');
        marker.setAttribute('aria-hidden', 'true');
        fields.insight.replaceChildren(marker, document.createTextNode(d.insight));
      }
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => setRiskEvent(btn.dataset.riskEvent));
  });

  // Initialize
  setRiskEvent('surge');
})();

/* Phase 03 · Reveal the overview once, only when it enters view. */
(() => {
  const section = document.getElementById('titan-overview');
  if (!section) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    section.classList.add('titan-overview--visible');
    return;
  }

  section.classList.add('titan-overview--motion-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      section.classList.add('titan-overview--visible');
      observer.unobserve(section);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
  observer.observe(section);
})();
