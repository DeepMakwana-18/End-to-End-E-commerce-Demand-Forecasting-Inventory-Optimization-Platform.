/* =========================================================================
   EXPLORE INTELLIGENCE — DATAVISION CONTROLLER (landing/datavision.js)
   Clean hierarchy · Verified models · Calm interactive states
   ========================================================================= */

(() => {
  const productSection = document.getElementById('product');
  if (!productSection) return;

  const navItems = [...productSection.querySelectorAll('[data-module]')];
  const previewPanel = productSection.querySelector('#preview-panel');
  const views = [...productSection.querySelectorAll('.pv-view')];
  const stepLabel = productSection.querySelector('#pvStepLabel');
  const railEl = productSection.querySelector('.tab-rail');
  const autoplayBtn = productSection.querySelector('#pvAutoplayBtn');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTOPLAY_MS = 9000;
  let currentModule = 'forecast';
  let autoplayRaf = 0;
  let autoplayStart = 0;
  let demoCtrl = null;

  // Hydrate TabRail metrics from demoScenario
  if (window.demoScenario) {
    const s = window.demoScenario;
    const setMetric = (k, txt) => {
      const el = productSection.querySelector(`[data-rail-metric="${k}"]`);
      if (el) el.textContent = txt;
    };
    setMetric('forecast', `+30% peak in week ${s.forecastPeakWeek || 10}`);
    setMetric('inventory', '1 SKU below target');
    setMetric('risk', `+${s.spikePct || 48}% spike on day ${s.spikeDay || 14}`);
    setMetric('scenario', '9.2 days of cover with a +20% promotion');
  }

  const ASSUMPTIONS_COPY = {
    forecast: '12-week horizon modeled with XGBoost regressors and SHAP seasonal decomposition. Baseline demand is calculated from the prior 12-week moving average (1,554 units mean). Shaded band represents the 95% confidence interval (±1.96σ residual variance).',
    inventory: 'Derived Replenishment Math: Lead item SKU-4471 holds 660 units at 60 units/day demand (11.0 days cover). Ordering today with an 8-day supplier transit consumes 480 units, leaving 180 units upon receipt. Restoring the 18.0-day target (1,080 units) at delivery requires ordering 900 units (1,080 − 180).',
    risk: 'Stationary baseline μ = 60 units/day with residual σ = 9.0 units/day. Normal expected range corresponds to ±2.0σ bounds (42 to 78 units). Day 14 recorded 89 units (+3.2σ surge); Day 23 recorded 38 units (−2.4σ dip); Day 08 recorded 61 units (+0.1σ normal variance).',
    scenario: 'Baseline: 660 units at 60 units/day demand. Promotional uplift (+20%) increases daily velocity to 72 units/day, shortening cover to 9.2 days. Restoring the 13.0-day threshold requires 13 × 72 − 660 = 276 additional units.'
  };

  const assumptionsBtn = productSection.querySelector('#pvAssumptionsBtn');
  const assumptionsPanel = productSection.querySelector('#pvSharedAssumptions');
  const assumptionsText = productSection.querySelector('#pvAssumptionsText');

  assumptionsBtn?.addEventListener('click', () => {
    const expanded = assumptionsBtn.getAttribute('aria-expanded') === 'true';
    assumptionsBtn.setAttribute('aria-expanded', String(!expanded));
    if (assumptionsPanel) assumptionsPanel.hidden = expanded;
  });

  // =========================================================================
  // VIEW SWITCHING (Zero-height-jump single grid cell)
  // =========================================================================
  function switchView(viewName) {
    currentModule = viewName;
    const activeIdx = Math.max(0, navItems.findIndex(n => n.dataset.module === viewName));
    if (stepLabel) stepLabel.textContent = `STEP ${activeIdx + 1} OF ${navItems.length}`;
    if (railEl) railEl.style.setProperty('--rail-progress', String((activeIdx + 1) / navItems.length));
    if (assumptionsText && ASSUMPTIONS_COPY[viewName]) {
      assumptionsText.textContent = ASSUMPTIONS_COPY[viewName];
    }

    navItems.forEach(item => {
      const isSelected = item.dataset.module === viewName;
      item.classList.toggle('is-selected', isSelected);
      item.setAttribute('aria-selected', String(isSelected));
      item.tabIndex = isSelected ? 0 : -1;
      item.style.setProperty('--tab-progress', '0');
    });

    if (previewPanel) {
      previewPanel.dataset.activeView = viewName;
      previewPanel.setAttribute('aria-labelledby', `tab-${viewName}`);
    }

    views.forEach(view => {
      const match = view.dataset.view === viewName;
      view.removeAttribute('hidden');
      view.hidden = false;
      view.dataset.active = String(match);
      view.inert = !match;
      view.setAttribute('aria-hidden', String(!match));
      view.classList.toggle('is-active-view', match);
      if (match && !prefersReduced) {
        animateViewIn(view);
      }
    });
  }

  function animateViewIn(view) {
    // 600ms chart draw-in for SVG strokes/bars
    view.querySelectorAll('svg path[stroke]:not([stroke="none"]), svg polyline, svg line.pv-draw').forEach(path => {
      try {
        const len = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
        if (len > 4) {
          path.style.strokeDasharray = `${len}`;
          path.style.strokeDashoffset = `${len}`;
          path.animate(
            [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
            { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
          ).finished.catch(() => {}).finally(() => {
            path.style.strokeDasharray = '';
            path.style.strokeDashoffset = '';
          });
        }
      } catch (_) {}
    });

    // 400ms count-up for numeric KPIs inside active panel
    view.querySelectorAll('.pv-kpi-val, .pv-stat-val, strong[data-count]').forEach(el => {
      const raw = el.dataset.rawText || el.textContent.trim();
      el.dataset.rawText = raw;
      const m = raw.match(/^([^0-9.-]*)(-?\d+(?:[.,]\d+)?)(.*)$/);
      if (!m) return;
      const prefix = m[1], numStr = m[2].replace(/,/g, ''), suffix = m[3];
      const target = parseFloat(numStr);
      if (!Number.isFinite(target)) return;
      const decimals = (numStr.split('.')[1] || '').length;
      const hasComma = m[2].includes(',');
      const start = performance.now();
      const step = now => {
        const p = Math.min(1, (now - start) / 400);
        const eased = 1 - Math.pow(1 - p, 3);
        const cur = target * eased;
        let formatted = decimals > 0 ? cur.toFixed(decimals) : String(Math.round(cur));
        if (hasComma) formatted = Number(formatted).toLocaleString();
        el.textContent = prefix + formatted + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = raw;
      };
      requestAnimationFrame(step);
    });
  }

  // Keyboard navigation for navigation tabs (ArrowUp/Down, Home/End)
  navItems.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      if (demoCtrl) demoCtrl.stopByUser();
      updateAutoplayBtn(true);
      switchView(btn.dataset.module);
    });
    btn.addEventListener('keydown', e => {
      let nextIdx = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextIdx = (index + 1) % navItems.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nextIdx = (index - 1 + navItems.length) % navItems.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = navItems.length - 1;
      else return;
      e.preventDefault();
      if (demoCtrl) demoCtrl.stopByUser();
      updateAutoplayBtn(true);
      const next = navItems[nextIdx];
      next.focus();
      switchView(next.dataset.module);
    });
  });

  function updateAutoplayBtn(paused) {
    if (!autoplayBtn) return;
    autoplayBtn.textContent = paused ? 'Resume' : 'Pause';
    autoplayBtn.setAttribute('aria-pressed', String(paused));
  }

  function stopAutoplayLoop() {
    if (autoplayRaf) { cancelAnimationFrame(autoplayRaf); autoplayRaf = 0; }
  }

  function startAutoplayLoop() {
    if (prefersReduced || autoplayRaf) return;
    autoplayStart = performance.now();
    const tick = (now) => {
      if (document.hidden || !demoCtrl || demoCtrl.paused || demoCtrl.userStopped) {
        autoplayRaf = 0;
        return;
      }
      const elapsed = now - autoplayStart;
      const p = Math.min(1, elapsed / AUTOPLAY_MS);
      const activeTab = navItems.find(n => n.dataset.module === currentModule);
      if (activeTab) activeTab.style.setProperty('--tab-progress', p.toFixed(4));
      if (p >= 1) {
        const idx = Math.max(0, navItems.findIndex(n => n.dataset.module === currentModule));
        const next = navItems[(idx + 1) % navItems.length];
        switchView(next.dataset.module);
        autoplayStart = now;
      }
      autoplayRaf = requestAnimationFrame(tick);
    };
    autoplayRaf = requestAnimationFrame(tick);
  }

  if (window.TitanMotion && !prefersReduced) {
    demoCtrl = window.TitanMotion.registerDemo('product-rail', productSection, {
      start: () => { updateAutoplayBtn(false); startAutoplayLoop(); },
      pause: () => { stopAutoplayLoop(); }
    });
    productSection.addEventListener('mouseenter', () => stopAutoplayLoop());
    productSection.addEventListener('mouseleave', () => {
      if (demoCtrl && demoCtrl.visible && !demoCtrl.paused && !demoCtrl.userStopped) startAutoplayLoop();
    });
    productSection.addEventListener('focusin', () => stopAutoplayLoop());
    productSection.addEventListener('focusout', () => {
      if (demoCtrl && demoCtrl.visible && !demoCtrl.paused && !demoCtrl.userStopped && !productSection.contains(document.activeElement)) {
        startAutoplayLoop();
      }
    });
  } else {
    updateAutoplayBtn(true);
  }

  autoplayBtn?.addEventListener('click', () => {
    if (!demoCtrl) return;
    if (demoCtrl.paused || demoCtrl.userStopped) {
      demoCtrl.paused = false;
      demoCtrl.userStopped = false;
      updateAutoplayBtn(false);
      startAutoplayLoop();
    } else {
      demoCtrl.stopByUser();
      updateAutoplayBtn(true);
    }
  });

  // Cross-links from Overview section cards
  document.querySelectorAll('[data-goto-module]').forEach(card => {
    const navigate = e => {
      if (e) e.preventDefault();
      const mod = card.dataset.gotoModule;
      if (!mod) return;
      switchView(mod);
      productSection.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
      const targetTab = document.getElementById(`tab-${mod}`);
      if (targetTab) targetTab.focus();
    };
    card.addEventListener('click', navigate);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate();
      }
    });
  });

  // =========================================================================
  // VIEW 2: INVENTORY ROW SELECTION
  // =========================================================================
  const invItems = [...productSection.querySelectorAll('.pv-inv-item')];
  const invActionText = productSection.querySelector('#pvInvActionText');

  const INVENTORY_ACTIONS = [
    'Order 900 units today to restore 18 days of cover upon Day 8 arrival (180 units remain at delivery).',
    'Stock covers 28 days against a 20-day target. Next replenishment review scheduled in 8 days.',
    'Stock covers 34 days against a 25-day target. Surplus buffer covers projected demand with no reorder required.'
  ];

  function selectInventoryItem(index) {
    invItems.forEach((item, idx) => {
      const isSel = idx === index;
      item.classList.toggle('is-selected', isSel);
      item.setAttribute('aria-selected', String(isSel));
      item.tabIndex = isSel ? 0 : -1;
    });
    if (invActionText && INVENTORY_ACTIONS[index]) {
      invActionText.textContent = INVENTORY_ACTIONS[index];
    }
  }

  invItems.forEach((item, idx) => {
    item.addEventListener('click', () => selectInventoryItem(idx));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectInventoryItem(idx);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = invItems[(idx + 1) % invItems.length];
        next.focus();
        selectInventoryItem((idx + 1) % invItems.length);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = invItems[(idx - 1 + invItems.length) % invItems.length];
        prev.focus();
        selectInventoryItem((idx - 1 + invItems.length) % invItems.length);
      }
    });
  });

  // =========================================================================
  // VIEW 3: RISK RADAR PREVIEW INTERACTION
  // =========================================================================
  const riskButtons = [...productSection.querySelectorAll('[data-pv-risk]')];
  const riskHeadline = productSection.querySelector('#pvRiskHeadline');
  const riskSubtext = productSection.querySelector('#pvRiskSubtext');
  const riskInterpText = productSection.querySelector('#pvRiskInterpText');
  const riskMarker = productSection.querySelector('#pvRiskMarker');
  const riskStem = productSection.querySelector('#pvRiskStem');
  const riskPulse = productSection.querySelector('#pvRiskPulse');
  const riskDot = productSection.querySelector('#pvRiskDot');
  const riskBadgeText = productSection.querySelector('#pvRiskBadgeText');
  const riskBadgeBg = productSection.querySelector('.pv-badge-bg');

  const RISK_EVENTS = {
    steady: {
      headline: 'Demand within normal range',
      subtext: '61 units vs 60 expected.',
      interp: 'Normal daily variation; no reorder action needed.',
      x: 216, y: 85, stemLen: 60, units: '61 units',
      stemClass: 'stem-blue', pulseClass: 'pulse-blue', dotClass: 'dot-blue', bgClass: 'bg-blue'
    },
    surge: {
      headline: 'Demand jumped 48%',
      subtext: '89 units vs 60 expected.',
      interp: 'Review promotions and large orders.',
      x: 360, y: 48, stemLen: 97, units: '89 units',
      stemClass: 'stem-amber', pulseClass: 'pulse-amber', dotClass: 'dot-amber', bgClass: 'bg-amber'
    },
    drop: {
      headline: 'Demand fell 37%',
      subtext: '38 units vs 60 expected.',
      interp: 'Check checkout channel telemetry and stock availability.',
      x: 576, y: 116, stemLen: 29, units: '38 units',
      stemClass: 'stem-red', pulseClass: 'pulse-red', dotClass: 'dot-red', bgClass: 'bg-red'
    }
  };

  function setRiskEvent(key) {
    const data = RISK_EVENTS[key];
    if (!data) return;

    riskButtons.forEach(btn => {
      const active = btn.dataset.pvRisk === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    if (riskHeadline) riskHeadline.textContent = data.headline;
    if (riskSubtext) riskSubtext.textContent = data.subtext;
    if (riskInterpText) riskInterpText.textContent = data.interp;

    if (riskMarker) {
      riskMarker.setAttribute('transform', `translate(${data.x}, ${data.y})`);
      if (riskStem) {
        riskStem.className.baseVal = `pv-marker-stem ${data.stemClass}`;
        riskStem.setAttribute('y2', String(data.stemLen));
      }
      if (riskPulse) riskPulse.className.baseVal = `pv-marker-pulse ${data.pulseClass}`;
      if (riskDot) riskDot.className.baseVal = `pv-marker-dot ${data.dotClass}`;
      if (riskBadgeText) riskBadgeText.textContent = data.units;
      if (riskBadgeBg) riskBadgeBg.className.baseVal = `pv-badge-bg ${data.bgClass}`;
    }
  }

  riskButtons.forEach(btn => {
    btn.addEventListener('click', () => setRiskEvent(btn.dataset.pvRisk));
  });

  // =========================================================================
  // VIEW 4: SCENARIO LAB INTERACTION
  // 660 units on-hand, 60 u/d baseline, 13d target threshold
  // =========================================================================
  const scenarioButtons = [...productSection.querySelectorAll('[data-pv-scenario]')];
  const baValA = productSection.querySelector('#pvBaValA');
  const baLabelB = productSection.querySelector('#pvBaLabelB');
  const baValB = productSection.querySelector('#pvBaValB');
  const ctrlName = productSection.querySelector('#pvCtrlName');
  const ctrlValReadout = productSection.querySelector('#pvCtrlValReadout');
  const slider = productSection.querySelector('#pvScenarioSlider');
  const resetBtn = productSection.querySelector('#pvResetBtn');
  const compWrap = productSection.querySelector('#pvComparisonWrap');
  const delayTimeline = productSection.querySelector('#pvDelayTimeline');
  const simBarVisual = productSection.querySelector('#pvSimBarVisual');
  const scenarioSentence = productSection.querySelector('#pvScenarioSentence');
  const scenarioAssumptions = productSection.querySelector('#pvScenarioAssumptions');

  const SCENARIO_DEFS = {
    promo: {
      initial: 20, min: 5, max: 35, step: 1, prefix: '+', suffix: '%',
      name: 'Demand increase',
      labelB: 'With promotion',
      calc: (val) => {
        const uplift = val / 100;
        const simDemand = 60 * (1 + uplift);
        const simCover = 660 / simDemand;
        const shortfall = Math.max(0, Math.ceil(13.0 * simDemand - 660));
        return {
          valB: `${simCover.toFixed(1)} days`,
          coverDays: simCover,
          sentence: shortfall > 0 
            ? `Add ${shortfall} units to reach 13 days of cover.`
            : `13-day target satisfied with existing stock.`,
          assumptions: `Baseline: 660 units at 60 units/day demand. Promotional uplift (+${val}%) increases daily velocity to ${simDemand.toFixed(1)} units/day, shortening cover to ${simCover.toFixed(1)} days. Restoring the 13.0-day threshold requires 13 × ${simDemand.toFixed(1)} − 660 = ${shortfall} additional units.`
        };
      }
    },
    price: {
      initial: 15, min: 5, max: 25, step: 1, prefix: '−', suffix: '%',
      name: 'Price decrease',
      labelB: 'With price elasticity',
      calc: (val) => {
        // Unit elasticity: -X% price = +X% demand
        const uplift = val / 100;
        const simDemand = 60 * (1 + uplift);
        const simCover = 660 / simDemand;
        const shortfall = Math.max(0, Math.ceil(13.0 * simDemand - 660));
        return {
          valB: `${simCover.toFixed(1)} days`,
          coverDays: simCover,
          sentence: shortfall > 0 
            ? `Add ${shortfall} units to reach 13 days of cover.`
            : `13-day target satisfied with existing stock.`,
          assumptions: `Unit elasticity assumption (E = −1): A −${val}% price reduction generates +${val}% demand (${simDemand.toFixed(1)} units/day). Coverage shortens to ${simCover.toFixed(1)} days. Restoring the 13.0-day threshold requires 13 × ${simDemand.toFixed(1)} − 660 = ${shortfall} additional units.`
        };
      }
    },
    delay: {
      initial: 10, min: 1, max: 14, step: 1, prefix: '+', suffix: 'd',
      name: 'Inbound delay',
      labelB: 'Delayed arrival',
      calc: (val) => {
        const delayedDay = 8 + val; // planned Day 8 + delay
        const gapDays = Math.max(0, delayedDay - 11);
        const gapUnits = gapDays * 60;
        return {
          delayedDay,
          gapDays,
          gapUnits,
          valB: `Day ${delayedDay}`,
          sentence: gapDays > 0 
            ? `7 days without stock cover (~${gapUnits} units unserved).`
            : `Stock covers demand through arrival with ${11 - delayedDay} days of buffer.`,
          assumptions: `Inbound PO of 780 units scheduled for Day 8 is delayed by ${val} days (arriving Day ${delayedDay}). Warehouse stock (660 units at 60 u/d) depletes on Day 11, leaving a ${gapDays}-day unserved gap (~${gapUnits} units) before replenishment arrives.`
        };
      }
    }
  };

  let currentScenario = 'promo';
  const scenarioValues = { promo: 20, price: 15, delay: 10 };

  function updateScenario() {
    const d = SCENARIO_DEFS[currentScenario];
    const val = scenarioValues[currentScenario];
    const res = d.calc(val);

    scenarioButtons.forEach(btn => {
      const active = btn.dataset.pvScenario === currentScenario;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    if (slider) {
      slider.min = String(d.min);
      slider.max = String(d.max);
      slider.step = String(d.step);
      slider.value = String(val);
      const progress = ((val - d.min) / (d.max - d.min)) * 100;
      slider.style.setProperty('--pv-slider-progress', `${progress}%`);
    }

    if (ctrlName) ctrlName.textContent = d.name;
    if (ctrlValReadout) ctrlValReadout.textContent = `${d.prefix}${val}${d.suffix}`;
    if (baLabelB) baLabelB.textContent = d.labelB;
    if (baValB) baValB.textContent = res.valB;

    if (currentScenario === 'delay') {
      // Delay Mode: Strictly show Timeline, hide Comparison Bars
      if (compWrap) {
        compWrap.hidden = true;
        compWrap.setAttribute('hidden', '');
        compWrap.style.display = 'none';
      }
      if (delayTimeline) {
        delayTimeline.hidden = false;
        delayTimeline.removeAttribute('hidden');
        delayTimeline.style.display = 'block';
      }

      const delayRect = productSection.querySelector('#pvDelayExposeRect');
      const delayText = productSection.querySelector('#pvDelayExposeText');
      const delayNode = productSection.querySelector('#pvDelayedPOGroup');
      const delayNodeLbl = productSection.querySelector('#pvDelayNodeLbl');

      // Timeline scale: Day 0 = 48px, Day 11 = 418px (~33.64px/day)
      const delayedX = Math.min(720, 48 + res.delayedDay * 33.64);
      const intervalW = Math.max(0, delayedX - 418);

      if (delayRect) {
        if (res.gapDays > 0) {
          delayRect.setAttribute('x', '418');
          delayRect.setAttribute('width', String(Math.max(12, intervalW)));
          delayRect.style.display = 'block';
        } else {
          delayRect.style.display = 'none';
        }
      }
      if (delayText) {
        if (res.gapDays > 0) {
          delayText.setAttribute('x', String(418 + intervalW / 2));
          delayText.textContent = `${res.gapDays} DAYS WITHOUT STOCK COVER`;
          delayText.style.display = 'block';
        } else {
          delayText.style.display = 'none';
        }
      }
      if (delayNode) delayNode.setAttribute('transform', `translate(${delayedX}, 45)`);
      if (delayNodeLbl) delayNodeLbl.textContent = `Delayed arrival (Day ${res.delayedDay})`;

      if (scenarioSentence) {
        scenarioSentence.textContent = res.sentence;
      }
      if (scenarioAssumptions) {
        scenarioAssumptions.textContent = res.assumptions;
      }

    } else {
      // Promo & Price Modes: Strictly show Comparison Bars, hide Timeline
      if (compWrap) {
        compWrap.hidden = false;
        compWrap.removeAttribute('hidden');
        compWrap.style.display = 'block';
      }
      if (delayTimeline) {
        delayTimeline.hidden = true;
        delayTimeline.setAttribute('hidden', '');
        delayTimeline.style.display = 'none';
      }

      // Bar scale: 0 to 16 days. 16 days = 100% width
      const barPercent = Math.min(100, Math.max(5, (res.coverDays / 16) * 100));
      if (simBarVisual) {
        simBarVisual.style.width = `${barPercent.toFixed(1)}%`;
      }

      if (scenarioSentence) {
        scenarioSentence.textContent = res.sentence;
      }
      if (scenarioAssumptions) {
        scenarioAssumptions.textContent = res.assumptions;
      }
    }
  }

  scenarioButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentScenario = btn.dataset.pvScenario;
      updateScenario();
    });
  });

  if (slider) {
    const handleSliderChange = () => {
      scenarioValues[currentScenario] = Number(slider.value);
      updateScenario();
    };
    slider.addEventListener('input', handleSliderChange);
    slider.addEventListener('change', handleSliderChange);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      scenarioValues[currentScenario] = SCENARIO_DEFS[currentScenario].initial;
      updateScenario();
    });
  }

  // Initialize
  setRiskEvent('surge');
  updateScenario();
  switchView('forecast');
})();
