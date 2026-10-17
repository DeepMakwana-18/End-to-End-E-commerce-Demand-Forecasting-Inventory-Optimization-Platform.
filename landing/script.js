const modules = {
  forecast: {
    kicker: "Demand forecast",
    question: "What will demand look like next?",
    title: "See the curve before it becomes the quarter.",
    metricA: "92%",
    metricBLabel: "PEAK DEMAND",
    metricB: "1,840",
    insight: "Demand is likely to rise in the next four weeks."
  },
  inventory: {
    kicker: "Inventory intelligence",
    question: "Where is inventory out of balance?",
    title: "Know what to replenish, hold, and move.",
    metricA: "86%",
    metricBLabel: "AT-RISK SKUS",
    metricB: "14",
    insight: "Three fast-moving SKUs are approaching safety stock."
  },
  risk: {
    kicker: "Risk radar",
    question: "What needs attention right now?",
    title: "Turn hidden anomalies into visible priorities.",
    metricA: "89%",
    metricBLabel: "ACTIVE ALERTS",
    metricB: "03",
    insight: "SKU-204 has the highest stockout exposure this week."
  },
  scenario: {
    kicker: "Scenario lab",
    question: "What changes if the market shifts?",
    title: "Test the decision before you commit to it.",
    metricA: "4",
    metricBLabel: "BEST SCENARIO",
    metricB: "+12%",
    insight: "A 320-unit reorder best balances service and holding cost."
  }
};

const header = document.querySelector("[data-header]");
const darkScenes = [...document.querySelectorAll(".scene-dark")];

const updateHeader = () => {
  header.classList.toggle("scrolled", window.scrollY > 38);
  const y = 46;
  const isDark = darkScenes.some(scene => {
    const rect = scene.getBoundingClientRect();
    return rect.top <= y && rect.bottom >= y;
  });
  header.classList.toggle("on-dark", isDark);
};

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

const popObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      popObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.18 });
document.querySelectorAll(".pop-card").forEach(el => popObserver.observe(el));

const heroScene = document.querySelector(".hero");
const heroStage = document.querySelector(".hero-stage");
const operationsScene = document.querySelector("[data-scroll-scene]");
const operationCards = [...document.querySelectorAll("[data-ops-card]")];
const operationThresholds = [0.07, 0.29, 0.51, 0.73];

const clamp = value => Math.min(1, Math.max(0, value));
const updateCinematicScroll = () => {
  if (heroScene && heroStage) {
    const heroProgress = clamp(window.scrollY / Math.max(heroScene.offsetHeight, 1));
    heroStage.style.setProperty("--hero-scale", String(1 + heroProgress * .07));
    heroStage.style.setProperty("--hero-y", `${heroProgress * 34}px`);
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
  operationsScene.style.setProperty("--ops-orbit-scale", String(.86 + progress * .14));
  operationCards.forEach((card, index) => {
    card.classList.toggle("active", progress >= operationThresholds[index]);
  });
};

window.addEventListener("scroll", updateCinematicScroll, { passive: true });
window.addEventListener("resize", updateCinematicScroll);
updateCinematicScroll();

const core = document.querySelector("[data-core]");
if (core && window.matchMedia("(pointer:fine)").matches) {
  core.closest(".hero-stage").addEventListener("pointermove", event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    core.style.setProperty("--ry", `${x * 8}deg`);
    core.style.setProperty("--rx", `${y * -8}deg`);
  });
  core.closest(".hero-stage").addEventListener("pointerleave", () => {
    core.style.setProperty("--ry", "0deg");
    core.style.setProperty("--rx", "0deg");
  });
}

const tabs = [...document.querySelectorAll("[data-module]")];
const fields = {
  kicker: document.querySelector("#module-kicker"),
  question: document.querySelector("#module-question"),
  title: document.querySelector("#module-title"),
  metricA: document.querySelector("#module-metric-a"),
  metricBLabel: document.querySelector("#module-metric-b-label"),
  metricB: document.querySelector("#module-metric-b"),
  insight: document.querySelector("#module-insight")
};
const visual = document.querySelector("#stage-visual");

function selectModule(name) {
  const data = modules[name];
  tabs.forEach(tab => tab.setAttribute("aria-selected", String(tab.dataset.module === name)));
  Object.entries(fields).forEach(([key, node]) => {
    node.animate([{ opacity: .15, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 360, easing: "ease-out" });
    if (key === "insight") node.innerHTML = `<i></i>${data[key]}`;
    else node.textContent = data[key];
  });
  visual.dataset.mode = name;
  visual.animate([{ opacity: .45 }, { opacity: 1 }], { duration: 420 });
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
