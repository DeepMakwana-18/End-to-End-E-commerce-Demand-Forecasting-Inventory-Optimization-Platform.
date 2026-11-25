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
    return rect.top <= y && rect.bottom >= y && (scene.id !== "closing" || scene.dataset.arcDark !== "false");
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
    } else {
      if (deactivateTimer) clearTimeout(deactivateTimer);
      deactivateTimer = setTimeout(() => {
        demandActive = false;
        chipDemand?.classList.remove("is-active");
        nodeDemand?.classList.remove("is-active");
        haloDemand?.classList.remove("is-active");
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
    chipDemand.addEventListener("click", () => setDemandActive(true));
  }

  if (hitDemand) {
    hitDemand.addEventListener("click", (e) => {
      e.preventDefault();
      setDemandActive(true);
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
    let currentPos = 50;

    const set = v => {
      const clamped = Math.max(4, Math.min(96, v));
      currentPos = clamped;
      wipe.style.setProperty("--pos", clamped.toFixed(1) + "%");
      wipe.setAttribute("aria-valuenow", String(Math.round(clamped)));
      wipe.setAttribute("aria-valuetext", Math.round(clamped) + "% of the spreadsheet view shown");
      if (range) {
        range.value = clamped;
      }
    };

    set(50);

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

    wipe.addEventListener("keydown", e => {
      let next = null;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = currentPos - 5;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = currentPos + 5;
      else if (e.key === "Home") next = 4;
      else if (e.key === "End") next = 96;
      if (next === null) return;
      e.preventDefault();
      touched = true;
      wipe.classList.add("touched");
      set(next);
    });

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

    // One-time intro sweep: 50 -> 68 -> 50 (~1.6s)
    if (!reduce) {
      new IntersectionObserver((es, ob) => {
        if (!es[0].isIntersecting) return;
        ob.disconnect();
        const t0 = performance.now();
        const dur = 1600;
        const step = now => {
          if (touched) return;
          const p = Math.min(1, (now - t0) / dur);
          const pos = p < 0.5
            ? 50 + 18 * Math.sin((p / 0.5) * (Math.PI / 2))
            : 68 - 18 * Math.sin(((p - 0.5) / 0.5) * (Math.PI / 2));
          set(pos);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { threshold: 0.35 }).observe(wipe);
    }
  }

  // Theme-aware sticky nav backdrop driven by data-theme and IntersectionObserver + scroll probe
  const navBackdrop = document.querySelector(".nav-scroll-backdrop");
  const themedSections = [...document.querySelectorAll("section[data-theme]")];
  if (navBackdrop && themedSections.length) {
    const syncNavBackdrop = () => {
      const probeY = 52; // centered under navbar pill
      const active = themedSections.find(sec => {
        const r = sec.getBoundingClientRect();
        return r.top <= probeY && r.bottom > probeY;
      });
      const isDark = active ? active.getAttribute("data-theme") === "dark" && (active.id !== "closing" || active.dataset.arcDark !== "false") : false;
      navBackdrop.classList.toggle("is-dark", isDark);
    };

    if ("IntersectionObserver" in window) {
      const navObserver = new IntersectionObserver(() => {
        syncNavBackdrop();
      }, {
        rootMargin: "-40px 0px -80% 0px",
        threshold: [0, 0.1, 0.5, 1.0]
      });
      themedSections.forEach(sec => navObserver.observe(sec));
    }

    window.addEventListener("scroll", syncNavBackdrop, { passive: true });
    document.body.addEventListener("scroll", syncNavBackdrop, { passive: true });
    window.addEventListener("resize", syncNavBackdrop, { passive: true });
    syncNavBackdrop();
  }
})();


/* ===== v5 · motion & storytelling ===== */
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
      links.forEach(a => {
        a.classList.remove("active");
        a.removeAttribute("aria-current");
      });
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
    links.forEach(a => {
      const isActive = Boolean(currentId && a.getAttribute("href") === "#" + currentId);
      a.classList.toggle("active", isActive);
      if (isActive) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
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

/* Category use-case tabs */
(() => {
  const section = document.querySelector('[data-use-cases]');
  if (!section) return;

  const tabs = [...section.querySelectorAll('[role="tab"]')];
  const panels = [...section.querySelectorAll('[role="tabpanel"]')];
  if (!tabs.length || !panels.length) return;

  const activate = (tab, moveFocus = false) => {
    const selectedCase = tab.dataset.useCase;
    tabs.forEach(item => {
      const selected = item === tab;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => {
      const active = panel.dataset.useCasePanel === selectedCase;
      panel.hidden = false;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', String(!active));
      panel.tabIndex = active ? 0 : -1;
    });
    if (moveFocus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let nextIndex = index;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(tabs[nextIndex], true);
    });
  });
})();

/* --------------------------------------------------------------------------
   Replenishment timing section: Interactive chart & demoScenario logic
   - Driven by demoScenario (SKU-204)
   - Order day slider: 0 to 6 (default 3)
   - Live updates to transit bar, gap hatch, outcome chip, and accessible table
   - Animated entrance on 50% viewport intersection (disabled under reduced motion)
   -------------------------------------------------------------------------- */
(() => {
  const demoScenario = window.demoScenario || {
    sku: 'SKU-204',
    name: 'Apex Sprint Footwear',
    baselineDemand: 60, // units/day
    onHand: 660,        // units
    leadTime: 8,        // days
    targetCover: 18,    // days
    coverDays: 11       // 660 / 60
  };
  window.demoScenario = demoScenario;

  const section = document.getElementById('planning-context');
  if (!section) return;

  const slider = document.getElementById('orderDaySlider');
  const badge = document.getElementById('orderDayValueBadge');
  const transitBar = document.getElementById('runwayTransitBar');
  const transitSublabel = document.getElementById('transitSublabel');
  const transitInlineLabel = document.getElementById('transitInlineLabel');
  const hatch = document.getElementById('runwayHatch');
  const hatchLbl = document.getElementById('runwayHatchLbl');
  const outcome = document.getElementById('chainOutcome');
  const outcomeText = document.getElementById('chainOutcomeText');
  const srTransitRow = document.getElementById('srTransitRow');
  const plot = document.getElementById('chainRunwayPlot');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateReplenishment = (orderDay) => {
    orderDay = parseInt(orderDay, 10);
    if (isNaN(orderDay)) orderDay = 3;

    const leadTime = demoScenario.leadTime; // 8
    const coverDays = demoScenario.coverDays; // 11
    const baselineDemand = demoScenario.baselineDemand; // 60
    const arrival = orderDay + leadTime; // e.g. 3 + 8 = 11

    // 1. Update slider & badge
    if (badge) badge.textContent = `Day ${orderDay}`;
    if (slider) {
      slider.value = orderDay;
      slider.setAttribute('aria-valuenow', orderDay);
      slider.setAttribute('aria-valuetext', `Order on day ${orderDay}, arrives day ${arrival}`);
    }

    // 2. Update transit bar position & duration
    if (transitBar) {
      transitBar.style.setProperty('--start', orderDay);
      transitBar.style.setProperty('--dur', leadTime);
    }
    if (transitSublabel) transitSublabel.textContent = `8 days in transit (arrives Day ${arrival})`;
    if (transitInlineLabel) transitInlineLabel.textContent = `8 days in transit`;

    // 3. Update accessible table
    if (srTransitRow) {
      srTransitRow.innerHTML = `<td>Supplier transit</td><td>${orderDay}</td><td>${arrival}</td><td>8 days</td>`;
    }

    // 4. Update plot aria-label
    if (plot) {
      plot.setAttribute(
        'aria-label',
        `Timeline for SKU-204: current stock lasts 11 days; review window lasts 3 days; supplier transit is 8 days, arriving day ${arrival} when ordering on day ${orderDay}.`
      );
    }

    // 5. Update hatch (gap after day 11 if arrival > 11)
    if (hatch && hatchLbl) {
      if (arrival > coverDays) {
        const gapDays = arrival - coverDays;
        hatch.style.display = 'block';
        hatch.style.setProperty('--hatch-start', coverDays);
        hatch.style.setProperty('--hatch-dur', gapDays);
        hatchLbl.textContent = `${gapDays}d without stock`;
        hatch.setAttribute('aria-label', `${gapDays} days without stock`);
      } else {
        hatch.style.display = 'none';
        hatch.style.setProperty('--hatch-dur', 0);
        hatchLbl.textContent = '';
      }
    }

    // 6. Compute outcome chip
    if (outcome && outcomeText) {
      outcome.classList.remove('is-green', 'is-amber', 'is-red');
      if (arrival < coverDays) {
        const spareDays = coverDays - arrival;
        const spareUnits = spareDays * baselineDemand;
        outcome.classList.add('is-green');
        outcomeText.textContent = `Arrives day ${arrival}: ${spareDays} days (${spareUnits} units) to spare`;
      } else if (arrival === coverDays) {
        outcome.classList.add('is-amber');
        outcomeText.textContent = `Arrives day 11: no room for delays. This is the last safe day.`;
      } else {
        const gapDays = arrival - coverDays;
        outcome.classList.add('is-red');
        outcomeText.textContent = `Arrives day ${arrival}: ${gapDays} days without stock`;
      }
    }
  };

  if (slider) {
    slider.addEventListener('input', (e) => {
      updateReplenishment(e.target.value);
    });
  }

  // Initial calculation
  updateReplenishment(slider ? slider.value : 3);

  // Entrance animation on 50% threshold intersection
  if (!reduceMotion && 'IntersectionObserver' in window) {
    let animated = false;
    const entranceObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animated) {
          animated = true;
          section.classList.add('is-animated');
          entranceObserver.unobserve(section);
        }
      });
    }, { threshold: 0.5 });
    entranceObserver.observe(section);
  } else {
    section.classList.add('is-animated');
  }
})();

/* --------------------------------------------------------------------------
   Explainable planning section (#decision-trail):
   - Reads defaults from window.demoScenario (onHand: 660, demand: 60, leadTime: 8)
   - Live stepper controls with min/max bounds + Reset button
   - Steps drive card highlights (01 inputs, 02 cover math, 03 result + callout)
   - Autoplay (4s) on 50% intersection, pauses on hover/focus, stops permanently on user click/edit
   - Connector track & orange fill centered dynamically on number circles
   -------------------------------------------------------------------------- */
(() => {
  const section = document.getElementById('decision-trail');
  if (!section) return;

  const scenario = window.demoScenario || {
    onHand: 660,
    baselineDemand: 60,
    leadTime: 8
  };

  const defaults = {
    onHand: scenario.onHand || 660,
    demand: scenario.baselineDemand || 60,
    leadTime: scenario.leadTime || 8
  };

  const limits = {
    onHand: { min: 120, max: 1500, step: 30 },
    demand: { min: 20, max: 120, step: 5 },
    leadTime: { min: 2, max: 14, step: 1 }
  };

  const state = {
    onHand: defaults.onHand,
    demand: defaults.demand,
    leadTime: defaults.leadTime,
    activeStep: 1,
    autoplayStopped: false,
    isHovered: false,
    isFocused: false,
    inView: false
  };

  const els = {
    stepsList: document.getElementById('decisionTrailSteps'),
    connector: document.getElementById('decisionTrailConnector'),
    connectorFill: document.getElementById('decisionTrailConnectorFill'),
    stepBtns: Array.from(section.querySelectorAll('.decision-step__btn')),
    card: document.getElementById('decisionTrailCard'),
    onHandVal: document.getElementById('calcOnHandVal'),
    demandVal: document.getElementById('calcDemandVal'),
    leadVal: document.getElementById('calcLeadVal'),
    onHandDec: document.getElementById('calcOnHandDec'),
    onHandInc: document.getElementById('calcOnHandInc'),
    demandDec: document.getElementById('calcDemandDec'),
    demandInc: document.getElementById('calcDemandInc'),
    leadDec: document.getElementById('calcLeadDec'),
    leadInc: document.getElementById('calcLeadInc'),
    resetBtn: document.getElementById('calcResetBtn'),
    coverEq: document.getElementById('calcCoverEq'),
    windowEq: document.getElementById('calcWindowEq'),
    resultChip: document.getElementById('calcResultChip'),
    resultNum: document.getElementById('calcResultNum'),
    resultLabel: document.getElementById('calcResultLabel')
  };

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const autoplayBtn = document.getElementById('trailAutoplayBtn');
  let autoplayTimer = null;

  const updateAutoplayBtn = () => {
    if (!autoplayBtn) return;
    const paused = state.autoplayStopped || reduceMotion || isCoarsePointer;
    autoplayBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    autoplayBtn.textContent = paused ? 'Play steps' : 'Pause steps';
  };

  const round1 = (val) => Math.round(val * 10) / 10;

  const updateConnector = () => {
    if (!els.stepsList || !els.connector || !els.connectorFill || els.stepBtns.length < 3) return;
    const circles = els.stepBtns.map(btn => btn.querySelector('.decision-step__index')).filter(Boolean);
    if (circles.length < 3) return;

    const listRect = els.stepsList.getBoundingClientRect();
    if (listRect.height === 0) return;

    const firstRect = circles[0].getBoundingClientRect();
    const lastRect = circles[circles.length - 1].getBoundingClientRect();
    const activeCircle = circles[state.activeStep - 1] || circles[0];
    const activeRect = activeCircle.getBoundingClientRect();

    const centerX = (firstRect.left + firstRect.width / 2) - listRect.left;
    const startY = (firstRect.top + firstRect.height / 2) - listRect.top;
    const endY = (lastRect.top + lastRect.height / 2) - listRect.top;
    const activeY = (activeRect.top + activeRect.height / 2) - listRect.top;

    els.connector.style.left = `${centerX}px`;
    els.connector.style.top = `${startY}px`;
    els.connector.style.height = `${Math.max(0, endY - startY)}px`;
    els.connectorFill.style.height = `${Math.max(0, activeY - startY)}px`;
  };

  const setActiveStep = (stepNum) => {
    state.activeStep = stepNum;
    section.setAttribute('data-active-step', String(stepNum));
    els.stepBtns.forEach(btn => {
      const btnStep = Number(btn.getAttribute('data-step'));
      const isCurrent = btnStep === stepNum;
      btn.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        btn.setAttribute('aria-current', 'step');
      } else {
        btn.removeAttribute('aria-current');
      }
    });
    updateConnector();
  };

  const renderCalculation = () => {
    const cover = round1(state.onHand / state.demand);
    const reviewWindow = round1(cover - state.leadTime);

    if (els.onHandVal) els.onHandVal.textContent = String(state.onHand);
    if (els.demandVal) els.demandVal.textContent = String(state.demand);
    if (els.leadVal) els.leadVal.textContent = String(state.leadTime);

    if (els.onHandDec) els.onHandDec.disabled = state.onHand <= limits.onHand.min;
    if (els.onHandInc) els.onHandInc.disabled = state.onHand >= limits.onHand.max;
    if (els.demandDec) els.demandDec.disabled = state.demand <= limits.demand.min;
    if (els.demandInc) els.demandInc.disabled = state.demand >= limits.demand.max;
    if (els.leadDec) els.leadDec.disabled = state.leadTime <= limits.leadTime.min;
    if (els.leadInc) els.leadInc.disabled = state.leadTime >= limits.leadTime.max;

    if (els.coverEq) els.coverEq.textContent = `${state.onHand} / ${state.demand} = ${cover} days`;
    if (els.windowEq) els.windowEq.textContent = `${cover} - ${state.leadTime} = ${reviewWindow} days`;

    if (els.resultChip && els.resultNum && els.resultLabel) {
      els.resultChip.classList.remove('is-positive', 'is-amber', 'is-danger');
      if (reviewWindow > 0) {
        els.resultChip.classList.add('is-positive');
        els.resultNum.textContent = String(reviewWindow);
        els.resultLabel.textContent = 'days to review';
      } else if (reviewWindow === 0) {
        els.resultChip.classList.add('is-amber');
        els.resultNum.textContent = '0';
        els.resultLabel.textContent = 'Order today. No buffer left.';
      } else {
        els.resultChip.classList.add('is-danger');
        els.resultNum.textContent = String(reviewWindow);
        els.resultLabel.textContent = `Already late: stock runs out ${Math.abs(reviewWindow)} days before arrival`;
      }
    }
  };

  const stopAutoplayPermanently = () => {
    state.autoplayStopped = true;
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    updateAutoplayBtn();
  };

  const syncAutoplay = () => {
    if (reduceMotion || isCoarsePointer || state.autoplayStopped) {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
      updateAutoplayBtn();
      return;
    }

    const shouldRun = state.inView && !state.isHovered && !state.isFocused;
    if (shouldRun && !autoplayTimer) {
      autoplayTimer = setInterval(() => {
        const next = state.activeStep >= 3 ? 1 : state.activeStep + 1;
        setActiveStep(next);
      }, 4000);
    } else if (!shouldRun && autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    updateAutoplayBtn();
  };

  if (autoplayBtn) {
    autoplayBtn.addEventListener('click', () => {
      if (state.autoplayStopped) {
        state.autoplayStopped = false;
        state.inView = true;
        syncAutoplay();
      } else {
        stopAutoplayPermanently();
      }
    });
  }

  const adjustInput = (key, dir) => {
    stopAutoplayPermanently();
    const cfg = limits[key];
    const nextVal = Math.min(cfg.max, Math.max(cfg.min, state[key] + dir * cfg.step));
    if (nextVal !== state[key]) {
      state[key] = nextVal;
      renderCalculation();
    }
  };

  // Step button clicks
  els.stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stopAutoplayPermanently();
      const stepNum = Number(btn.getAttribute('data-step')) || 1;
      setActiveStep(stepNum);
    });
  });

  // Stepper buttons
  if (els.onHandDec) els.onHandDec.addEventListener('click', () => adjustInput('onHand', -1));
  if (els.onHandInc) els.onHandInc.addEventListener('click', () => adjustInput('onHand', 1));
  if (els.demandDec) els.demandDec.addEventListener('click', () => adjustInput('demand', -1));
  if (els.demandInc) els.demandInc.addEventListener('click', () => adjustInput('demand', 1));
  if (els.leadDec) els.leadDec.addEventListener('click', () => adjustInput('leadTime', -1));
  if (els.leadInc) els.leadInc.addEventListener('click', () => adjustInput('leadTime', 1));

  // Reset button
  if (els.resetBtn) {
    els.resetBtn.addEventListener('click', () => {
      stopAutoplayPermanently();
      state.onHand = defaults.onHand;
      state.demand = defaults.demand;
      state.leadTime = defaults.leadTime;
      renderCalculation();
    });
  }

  // Hover & focus pause
  [els.stepsList, els.card].forEach(el => {
    if (!el) return;
    el.addEventListener('mouseenter', () => { state.isHovered = true; syncAutoplay(); });
    el.addEventListener('mouseleave', () => { state.isHovered = false; syncAutoplay(); });
    el.addEventListener('focusin', () => { state.isFocused = true; syncAutoplay(); });
    el.addEventListener('focusout', () => {
      setTimeout(() => {
        const active = document.activeElement;
        state.isFocused = !!(
          (els.stepsList && els.stepsList.contains(active)) ||
          (els.card && els.card.contains(active))
        );
        syncAutoplay();
      }, 0);
    });
  });

  // 50% viewport intersection for autoplay
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const trailObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        state.inView = entry.isIntersecting;
        syncAutoplay();
      });
    }, { threshold: 0.5 });
    trailObserver.observe(section);
  }

  window.addEventListener('resize', updateConnector);

  // Initial render
  setActiveStep(1);
  renderCalculation();
  requestAnimationFrame(updateConnector);
})();

/* --------------------------------------------------------------------------
   What you get section (#outputs):
   - Populates SKU-204 examples from window.demoScenario
   - 50% intersection flow animation (01 -> conn1 -> 02 -> conn2 -> 03, 800ms/step)
   - Interactive hover (@media (hover: hover)) & focus-visible active card highlight
   - Capability links jump to #product and select matching Intelligence tab
   -------------------------------------------------------------------------- */
(() => {
  const section = document.getElementById('outputs');
  if (!section) return;

  const s = Object.assign({
    baselineDemand: 60,
    spikeUnits: 89,
    spikePct: 48,
    spikeDay: 14,
    forecastPeakWeekly: 545,
    forecastPeakWeek: 10,
    recommendedOrderUnits: 900,
    reviewWindowDays: 3
  }, window.demoScenario || {});
  window.demoScenario = s;

  const exSense = document.getElementById('loopExSense');
  const exPredict = document.getElementById('loopExPredict');
  const exDecide = document.getElementById('loopExDecide');

  if (exSense) exSense.textContent = `+${s.spikePct}% demand spike on day ${s.spikeDay}`;
  if (exPredict) exPredict.textContent = `Peak of about ${s.forecastPeakWeekly} units a week in week ${s.forecastPeakWeek}`;
  if (exDecide) exDecide.textContent = `Order ${s.recommendedOrderUnits} units within the ${s.reviewWindowDays}-day review window`;

  const grid = document.getElementById('loopGrid');
  const cards = [
    document.getElementById('loopCard1'),
    document.getElementById('loopCard2'),
    document.getElementById('loopCard3')
  ].filter(Boolean);
  const conns = [
    document.getElementById('loopConn1'),
    document.getElementById('loopConn2')
  ].filter(Boolean);

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  let flowCompleted = false;

  const setActiveCard = (stepIndex) => {
    cards.forEach((card, idx) => {
      card.classList.toggle('is-active', idx === stepIndex);
    });
  };

  const setFinalRestingState = () => {
    flowCompleted = true;
    conns.forEach(c => c.classList.add('is-filled'));
    setActiveCard(2);
  };

  const runFlowSequence = () => {
    if (flowCompleted) return;
    if (reduceMotion) {
      setFinalRestingState();
      return;
    }

    // Step 1: 01 active
    conns.forEach(c => c.classList.remove('is-filled'));
    setActiveCard(0);

    // Step 2: connector 1 fills + 02 active (800ms)
    setTimeout(() => {
      if (conns[0]) conns[0].classList.add('is-filled');
      setActiveCard(1);
    }, 800);

    // Step 3: connector 2 fills + 03 active (1600ms)
    setTimeout(() => {
      if (conns[1]) conns[1].classList.add('is-filled');
      setActiveCard(2);
      flowCompleted = true;
    }, 1600);
  };

  if (!reduceMotion && 'IntersectionObserver' in window) {
    let triggered = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          runFlowSequence();
          observer.unobserve(section);
        }
      });
    }, { threshold: 0.5 });
    observer.observe(section);
  } else {
    setFinalRestingState();
  }

  // Hover & focus-visible highlight after flow settles
  cards.forEach((card, idx) => {
    if (canHover) {
      card.addEventListener('mouseenter', () => {
        if (!flowCompleted) return;
        setActiveCard(idx);
      });
    }
    card.addEventListener('focusin', () => {
      if (!flowCompleted) return;
      setActiveCard(idx);
    });
  });

  if (grid) {
    if (canHover) {
      grid.addEventListener('mouseleave', () => {
        if (!flowCompleted) return;
        setActiveCard(2);
      });
    }
    grid.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!flowCompleted) return;
        if (!grid.contains(document.activeElement)) {
          setActiveCard(2);
        }
      }, 0);
    });
  }

  // Linked capability items jump to Intelligence section and switch tab
  section.querySelectorAll('[data-jump-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-jump-tab');
      const targetTab = tabId ? document.getElementById(tabId) : null;
      const productSec = document.getElementById('product');
      if (targetTab) {
        targetTab.click();
      }
      if (productSec) {
        productSec.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
})();

/* --------------------------------------------------------------------------
   FAQ section (#faq):
   - Accessible button/region accordion (single open item, collapsible to none)
   - Keyboard nav: ArrowUp, ArrowDown, Home, End between headers
   - Hash link & "Why illustrative?" deep-link support (#faq-data-real, etc.)
   -------------------------------------------------------------------------- */
(() => {
  const accordion = document.getElementById('faqAccordion');
  if (!accordion) return;

  const items = Array.from(accordion.querySelectorAll('.faq-item'));
  const triggers = items.map(item => item.querySelector('.faq-trigger')).filter(Boolean);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setItemOpen = (targetItem, shouldOpen) => {
    items.forEach(item => {
      const btn = item.querySelector('.faq-trigger');
      const panel = item.querySelector('.faq-panel');
      const openThis = item === targetItem ? shouldOpen : false;
      item.classList.toggle('is-open', openThis);
      if (btn) btn.setAttribute('aria-expanded', openThis ? 'true' : 'false');
      if (panel) panel.setAttribute('aria-hidden', openThis ? 'false' : 'true');
    });
  };

  triggers.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const parentItem = btn.closest('.faq-item');
      if (!parentItem) return;
      const isCurrentlyOpen = parentItem.classList.contains('is-open');
      setItemOpen(parentItem, !isCurrentlyOpen);
    });

    btn.addEventListener('keydown', (e) => {
      let nextIdx = null;
      if (e.key === 'ArrowDown') nextIdx = (idx + 1) % triggers.length;
      else if (e.key === 'ArrowUp') nextIdx = (idx - 1 + triggers.length) % triggers.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = triggers.length - 1;

      if (nextIdx !== null) {
        e.preventDefault();
        triggers[nextIdx].focus();
      }
    });
  });

  const openAndScrollToFaqId = (hashId) => {
    if (!hashId || !hashId.startsWith('faq-')) return false;
    const targetItem = document.getElementById(hashId);
    if (!targetItem || !accordion.contains(targetItem)) return false;

    setItemOpen(targetItem, true);
    requestAnimationFrame(() => {
      targetItem.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    return true;
  };

  // Handle in-page links pointing to any #faq-* item (e.g. "Why illustrative?")
  document.querySelectorAll('a[href^="#faq-"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = (link.getAttribute('href') || '').slice(1);
      if (openAndScrollToFaqId(id)) {
        e.preventDefault();
        history.replaceState(null, '', '#' + id);
      }
    });
  });

  // Handle initial hash or target param
  const initialHash = window.location.hash ? window.location.hash.slice(1) : '';
  const urlTarget = new URLSearchParams(window.location.search).get('target');
  if (initialHash.startsWith('faq-')) {
    openAndScrollToFaqId(initialHash);
  } else if (urlTarget && urlTarget.startsWith('faq-')) {
    openAndScrollToFaqId(urlTarget);
  }

  window.addEventListener('hashchange', () => {
    const h = window.location.hash ? window.location.hash.slice(1) : '';
    if (h.startsWith('faq-')) openAndScrollToFaqId(h);
  });
})();

/* --------------------------------------------------------------------------
   Planning by category (#use-cases):
   - Horizontal swipe left/right between panels (40px threshold, touch-action: pan-y)
   -------------------------------------------------------------------------- */
(() => {
  const sec = document.getElementById('use-cases');
  if (!sec) return;
  const panels = sec.querySelector('.use-cases__panels');
  const tabs = Array.from(sec.querySelectorAll('.use-cases__tab'));
  if (!panels || tabs.length < 2) return;

  let startX = 0;
  let startY = 0;
  let tracking = false;

  panels.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    startX = e.clientX;
    startY = e.clientY;
    tracking = true;
  }, { passive: true });

  panels.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
      const currentIdx = tabs.findIndex(t => t.classList.contains('is-selected') || t.getAttribute('aria-selected') === 'true');
      const idx = currentIdx >= 0 ? currentIdx : 0;
      const nextIdx = dx < 0 ? Math.min(tabs.length - 1, idx + 1) : Math.max(0, idx - 1);
      if (nextIdx !== idx && tabs[nextIdx]) {
        tabs[nextIdx].click();
        tabs[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, { passive: true });
})();

