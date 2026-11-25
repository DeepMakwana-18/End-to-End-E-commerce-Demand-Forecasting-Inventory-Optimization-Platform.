(() => {
  'use strict';

  const base = {
    sku: 'SKU-4471',
    name: 'Apex Sprint Footwear',
    baselineDemand: 60, // units/day
    onHand: 660,        // units
    leadTime: 8,        // days
    targetCover: 18,    // days
    spikePct: 48,       // +48%
    spikeUnits: 89,     // 89 vs 60 expected
    spikeDay: 14,
    spikeSigma: 3.2,    // +3.2 sigma
    recommendedOrderUnits: 900,
    reviewWindowDays: 3,
    forecastPeakWeekly: 545,
    forecastPeakWeek: 10
  };

  const demoScenario = Object.assign({}, base, {
    coverDays() {
      return Math.round(this.onHand / this.baselineDemand); // 11
    },
    remainingAtDelivery() {
      return Math.max(0, this.onHand - this.leadTime * this.baselineDemand); // 180
    },
    postDeliveryUnits() {
      return this.remainingAtDelivery() + this.recommendedOrderUnits; // 1080
    },
    postDeliveryCoverDays() {
      return Math.round(this.postDeliveryUnits() / this.baselineDemand); // 18
    },
    arrivalDay(orderDay = 0) {
      return orderDay + this.leadTime;
    },
    gapDays(orderDay = 0) {
      return Math.max(0, this.arrivalDay(orderDay) - this.coverDays());
    }
  });

  window.demoScenario = demoScenario;

  function hydrateDemoNumbers() {
    const s = window.demoScenario;
    const cover = s.coverDays();
    const rem = s.remainingAtDelivery();
    const postCover = s.postDeliveryCoverDays();

    // Hero & How it works
    document.querySelectorAll('[data-demo-sku]').forEach(el => { el.textContent = s.sku; });
    document.querySelectorAll('[data-demo-order]').forEach(el => { el.textContent = `${s.recommendedOrderUnits.toLocaleString()} units`; });
    document.querySelectorAll('[data-demo-spike]').forEach(el => { el.textContent = `+${s.spikePct}%`; });

    // Intelligence Inventory View action text
    const invTitle = document.querySelector('#pv-inventory .pv-card-head h3');
    if (invTitle) {
      invTitle.textContent = `${s.sku} requires a ${s.recommendedOrderUnits}-unit order within ${s.reviewWindowDays} days.`;
    }
    const invSub = document.querySelector('#pv-inventory .pv-derived-note, #pv-inventory .pv-math-note');
    if (invSub) {
      invSub.innerHTML = `<strong>Derived Replenishment Math:</strong> Lead item ${s.sku} holds ${s.onHand} units at ${s.baselineDemand} units/day (${cover}-day cover). Ordering ${s.recommendedOrderUnits} units lands on Day ${s.leadTime} with ${rem} units left, restoring ${postCover} days of cover.`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateDemoNumbers);
  } else {
    hydrateDemoNumbers();
  }
})();
