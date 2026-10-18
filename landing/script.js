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
    decision: "Trigger prioritized reorders for SKUs approaching stockout thresholds before lead times lapse.",
    title: "Identify stock warnings and trigger timely replenishment.",
    metricA: "11 Days",
    metricALabel: "CRITICAL RUNWAY",
    metricBLabel: "REORDER NEEDED",
    metricB: "350 Units",
    insight: "SKU-204 breached 18-day safety threshold; immediate PO generation advised."
  },
  risk: {
    kicker: "Anomaly detection & risk radar",
    range: "STATISTICAL DEVIATION: +3.2σ SPIKE DETECTED",
    question: "What unusual changes require attention?",
    decision: "Isolate uncharacteristic demand spikes from seasonal variance to protect fulfillment.",
    title: "Separate true market shocks from baseline noise.",
    metricA: "+3.2σ",
    metricALabel: "ANOMALY SEVERITY",
    metricBLabel: "UNPLANNED SURGE",
    metricB: "+48%",
    insight: "Regional flash promotion caused +3.2σ spike; cross-depot transfer auto-triggered."
  },
  scenario: {
    kicker: "Scenario lab & what-if engine",
    range: "SIMULATION ENGINE · MULTI-VARIABLE STRESS TEST",
    question: "What happens if demand, pricing or supply conditions change?",
    decision: "Simulate demand shifts, price elasticity, and freight delays before capital is committed.",
    title: "Stress-test outcomes across demand, pricing, and supply.",
    metricA: "+24%",
    metricALabel: "DEMAND DELTA",
    metricBLabel: "SERVICE LEVEL",
    metricB: "98.2%",
    insight: "Expediting +320 units under promotion preserves target service level without over-stocking."
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
const operationsScene = document.querySelector("[data-scroll-scene]");
const operationCards = [...document.querySelectorAll("[data-ops-card]")];
const nfSteps = [...document.querySelectorAll(".nf-step")];
const nexusStatus = document.querySelector("#nexus-status");
const operationThresholds = [0.08, 0.32, 0.56, 0.80];

const clamp = value => Math.min(1, Math.max(0, value));

const updateCinematicScroll = () => {
  if (prefersReducedMotion) {
    operationCards.forEach(card => card.classList.add("active"));
    return;
  }

  if (heroScene && heroStage) {
    const heroProgress = clamp(window.scrollY / Math.max(heroScene.offsetHeight, 1));
    heroStage.style.setProperty("--hero-scale", String((1 - heroProgress * 0.08).toFixed(3)));
    heroStage.style.setProperty("--hero-y", `${(heroProgress * 48).toFixed(1)}px`);
    heroStage.style.setProperty("--hero-fade", String((1 - heroProgress * 0.85).toFixed(3)));
  }

  if (!operationsScene) return;
  if (window.innerWidth <= 820) {
    operationCards.forEach(card => card.classList.add("active"));
    return;
  }

  const maxTravel = operationsScene.offsetHeight - window.innerHeight;
  const progress = clamp((window.scrollY - operationsScene.offsetTop) / Math.max(maxTravel, 1));
  operationsScene.style.setProperty("--ops-progress", progress.toFixed(3));
  operationsScene.style.setProperty("--ops-width", `${(progress * 100).toFixed(1)}%`);
  operationsScene.style.setProperty("--ops-orbit-scale", String((0.88 + progress * 0.12).toFixed(3)));

  operationCards.forEach((card, index) => {
    const isActive = progress >= operationThresholds[index];
    card.classList.toggle("active", isActive);
  });

  if (nexusStatus && nfSteps.length) {
    if (progress >= 0.80) {
      nexusStatus.textContent = "SHARED CLARITY · PO ISSUED";
      nfSteps.forEach((s, i) => s.classList.toggle("active", true));
    } else if (progress >= 0.56) {
      nexusStatus.textContent = "OPTIMAL ACTION: REORDER 320";
      nfSteps.forEach((s, i) => s.classList.toggle("active", i <= 2));
    } else if (progress >= 0.32) {
      nexusStatus.textContent = "TITAN RISK ANALYSIS";
      nfSteps.forEach((s, i) => s.classList.toggle("active", i <= 1));
    } else {
      nexusStatus.textContent = "DEMAND SPIKE DETECTED";
      nfSteps.forEach((s, i) => s.classList.toggle("active", i === 0));
    }
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

const core = document.querySelector("[data-core]");
if (core && window.matchMedia("(pointer:fine)").matches) {
  core.closest(".hero-stage").addEventListener("pointermove", event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    core.style.setProperty("--ry", `${x * 10}deg`);
    core.style.setProperty("--rx", `${y * -10}deg`);
  });
  core.closest(".hero-stage").addEventListener("pointerleave", () => {
    core.style.setProperty("--ry", "0deg");
    core.style.setProperty("--rx", "0deg");
  });
}

const pipelineStages = [...document.querySelectorAll(".pipeline-stage")];
if (pipelineStages.length) {
  pipelineStages.forEach(stage => {
    stage.addEventListener("pointerenter", () => {
      pipelineStages.forEach(s => s.classList.remove("active"));
      stage.classList.add("active");
    });
  });
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
  tabs.forEach(tab => tab.setAttribute("aria-selected", String(tab.dataset.module === name)));
  Object.entries(fields).forEach(([key, node]) => {
    if (!node || data[key] === undefined) return;
    node.animate([{ opacity: .15, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 280, easing: "ease-out" });
    if (key === "insight") node.innerHTML = `<i></i>${data[key]}`;
    else if (key === "decision") node.innerHTML = `<span>DECISION</span> <b>${data[key]}</b>`;
    else node.textContent = data[key];
  });
  visual.dataset.mode = name;
  visual.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
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

const scenarioPresets = {
  promo: {
    title: "Summer Promotion (+20%)",
    legend: "Simulated: Promo Surge",
    areaD: "M 20 114 C 120 90, 240 46, 360 34 C 430 26, 465 22, 490 18 L 490 86 C 450 88, 400 92, 300 98 C 200 102, 100 110, 20 114 Z",
    lineD: "M 20 114 C 120 90, 240 46, 360 34 C 430 26, 465 22, 490 18",
    demandDelta: "+24% Lift",
    stockoutRisk: "HIGH (Day 9)",
    riskClass: true,
    action: "Expedite +320 units via air freight to preserve 98.2% customer service level.",
    metricA: "+24%",
    metricB: "98.2%",
    insight: "Expediting +320 units under promotion preserves target service level without over-stocking."
  },
  price: {
    title: "Price Reduction (-15%)",
    legend: "Simulated: Elasticity Lift",
    areaD: "M 20 114 C 120 100, 240 68, 360 56 C 430 48, 465 44, 490 40 L 490 86 C 450 88, 400 92, 300 98 C 200 102, 100 110, 20 114 Z",
    lineD: "M 20 114 C 120 100, 240 68, 360 56 C 430 48, 465 44, 490 40",
    demandDelta: "+16% Volume",
    stockoutRisk: "MODERATE (Day 18)",
    riskClass: false,
    action: "Schedule second replenishment run 10 days early; holding costs increase +4.2%.",
    metricA: "+16%",
    metricB: "96.5%",
    insight: "Price elasticity model predicts +16% volume lift with balanced inventory run rate."
  },
  delay: {
    title: "Port Disruption (+10d Lead Time)",
    legend: "Simulated: Supply Delay Shock",
    areaD: "M 20 114 C 120 128, 240 142, 360 148 C 430 154, 465 158, 490 162 L 490 86 C 450 88, 400 92, 300 98 C 200 102, 100 110, 20 114 Z",
    lineD: "M 20 114 C 120 128, 240 142, 360 148 C 430 154, 465 158, 490 162",
    demandDelta: "-18% Supply Flow",
    stockoutRisk: "CRITICAL (Day 6)",
    riskClass: true,
    action: "Re-route in-transit purchase orders to West Coast port; release safety reserve.",
    metricA: "-18%",
    metricB: "81.4%",
    insight: "Supplier lead time extension of 10 days breaches safety stock unless rerouted immediately."
  }
};

const scenarioButtons = [...document.querySelectorAll("[data-scenario]")];
const scAreaPath = document.querySelector("#sc-area-path");
const scLinePath = document.querySelector("#sc-line-path");
const scLegendLabel = document.querySelector("#sc-sim-legend-label");
const scTitle = document.querySelector("#sc-condition-title");
const scDelta = document.querySelector("#sc-demand-delta");
const scRisk = document.querySelector("#sc-stockout-risk");
const scAction = document.querySelector("#sc-prescribed-action");

scenarioButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const scKey = btn.dataset.scenario;
    const data = scenarioPresets[scKey];
    if (!data) return;
    scenarioButtons.forEach(b => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-pressed", String(b === btn));
    });
    if (scAreaPath) scAreaPath.setAttribute("d", data.areaD);
    if (scLinePath) scLinePath.setAttribute("d", data.lineD);
    if (scLegendLabel) scLegendLabel.textContent = data.legend;
    if (scTitle) scTitle.textContent = data.title;
    if (scDelta) scDelta.textContent = data.demandDelta;
    if (scRisk) {
      scRisk.textContent = data.stockoutRisk;
      scRisk.classList.toggle("risk-badge-text", data.riskClass);
    }
    if (scAction) scAction.textContent = data.action;
    if (fields.metricA) fields.metricA.textContent = data.metricA;
    if (fields.metricB) fields.metricB.textContent = data.metricB;
    if (fields.insight) fields.insight.innerHTML = `<i></i>${data.insight}`;
  });
});

const steps = [...document.querySelectorAll(".flow-step")];
let activeStep = 0;
const stepTimer = setInterval(() => {
  if (document.hidden) return;
  steps.forEach((step, index) => step.classList.toggle("active", index === activeStep));
  activeStep = (activeStep + 1) % steps.length;
}, 1700);

steps.forEach((step, index) => {
  step.addEventListener("mouseenter", () => {
    activeStep = index;
    steps.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === index));
  });
});

const toast = document.querySelector("[data-toast]");
document.querySelector("[data-review]").addEventListener("click", () => {
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
});
toast.querySelector("button").addEventListener("click", () => toast.classList.remove("show"));

window.addEventListener("pagehide", () => clearInterval(stepTimer), { once: true });
