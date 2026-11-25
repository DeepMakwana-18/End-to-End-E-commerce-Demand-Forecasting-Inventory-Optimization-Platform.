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
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =========================================================================
  // VIEW SWITCHING
  // =========================================================================
  function switchView(viewName) {
    navItems.forEach(item => {
      const isSelected = item.dataset.module === viewName;
      item.classList.toggle('is-selected', isSelected);
      item.setAttribute('aria-selected', String(isSelected));
      item.tabIndex = isSelected ? 0 : -1;
    });

    if (previewPanel) {
      previewPanel.dataset.activeView = viewName;
      previewPanel.setAttribute('aria-labelledby', `tab-${viewName}`);
    }

    views.forEach(view => {
      const match = view.dataset.view === viewName;
      if (match) {
        view.hidden = false;
        view.removeAttribute('hidden');
        view.style.display = 'flex';
        if (!prefersReduced && view.animate) {
          view.animate([
            { opacity: 0, transform: 'translateY(4px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 180, easing: 'ease-out' });
        }
      } else {
        view.hidden = true;
        view.setAttribute('hidden', '');
        view.style.display = 'none';
      }
    });
  }

  // Keyboard navigation for navigation tabs
  navItems.forEach((btn, index) => {
    btn.addEventListener('click', () => switchView(btn.dataset.module));
    btn.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      e.preventDefault();
      const dir = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1;
      const next = navItems[(index + dir + navItems.length) % navItems.length];
      next.focus();
      switchView(next.dataset.module);
    });
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
