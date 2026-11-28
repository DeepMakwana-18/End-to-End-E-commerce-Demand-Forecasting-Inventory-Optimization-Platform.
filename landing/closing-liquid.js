(() => {
  'use strict';
  const CTA_SOFT_SNAP = false;
  const section = document.querySelector('#closing');
  if (!section) return;
  const stage = section.querySelector('.closing-stage');
  const title = section.querySelector('#closing-title');
  const veil = section.querySelector('.closing-veil');
  const header = document.querySelector('[data-header]');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const coarseMQ = matchMedia('(pointer: coarse)');
  const mobileMQ = matchMedia('(max-width: 799px)');
  const isUnpinned = () => media.matches || mobileMQ.matches;

  const glass = window.TitanGlass;
  const qualityMon = glass ? glass.createQualityMonitor() : null;
  const spring = glass ? glass.createSpring(0, 110) : null;
  const rimObj = (glass && veil) ? glass.createRimSvg() : null;
  if (rimObj && veil) veil.appendChild(rimObj.svg);

  const lensObj = (glass && title && stage)
    ? glass.createLens({ targetEl: title, containerEl: stage, mode: 'screen' })
    : null;

  const orbitSlot = section.querySelector('.closing-orbit-slot');
  const getOrbitSvg = () => orbitSlot?.querySelector('.titan');

  const settleTargets = [
    section.querySelector('.closing-orbit-slot'),
    section.querySelector('.eyebrow'),
    section.querySelector('.closing-statement'),
    section.querySelector('.closing-actions'),
    section.querySelector('footer')
  ].filter(Boolean);

  const clamp = v => Math.max(0, Math.min(1, v));
  const ramp = (p, start, end) => clamp((p - start) / Math.max(0.0001, end - start));
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  let geometry = null;
  let targetP = 0;
  let renderedP = 0;
  let visible = false;
  let lastDark = null;
  let springRaf = 0;
  let lastTickTime = 0;
  let lastScrollY = window.scrollY || 0;
  let lastScrollTime = 0;
  let velocitySmoothed = 0;
  let snapTimer = null;
  let settledTriggered = false;
  let idleBeatTimer = null;

  function triggerOrbitBeat() {
    const svg = getOrbitSvg();
    if (!svg || !window.TitanMark || media.matches) return;
    window.TitanMark.setMode(svg, 'spin');
    setTimeout(() => {
      if (svg) window.TitanMark.setMode(svg, 'still');
    }, 700);
  }

  function startIdleBeats() {
    if (idleBeatTimer || media.matches) return;
    idleBeatTimer = setInterval(() => {
      if (visible && !document.hidden && settledTriggered && !media.matches) {
        triggerOrbitBeat();
      }
    }, 6000);
  }

  function stopIdleBeats() {
    if (idleBeatTimer) {
      clearInterval(idleBeatTimer);
      idleBeatTimer = null;
    }
  }

  function measure() {
    const h = window.innerHeight || 900;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    geometry = {
      top: sectionTop,
      height: section.offsetHeight,
      travel: Math.max(1, section.offsetHeight - h),
      h,
      veilHeight: veil ? veil.getBoundingClientRect().height : h * 3.2,
      navBottom: header?.getBoundingClientRect().bottom || 72,
      titleCenterY: (() => {
        const sr = stage.getBoundingClientRect();
        const tr = title.getBoundingClientRect();
        return (tr.top - sr.top) + tr.height / 2;
      })()
    };
    if (lensObj) lensObj.measure();
  }

  function render(p, currentScrollY) {
    const g = geometry;
    if (!g) return 0;

    // Task 5: Start rim already entering at bottom (0.90*h) at p=0 so no blank lead-in
    const sweepT = ramp(p, 0, 0.60);
    const rimY = g.h * (0.90 - 1.15 * sweepT);

    if (veil) {
      // veil top is -220svh, height is 320svh -> bottom is at 100svh (g.h) when translateY = 0
      const shiftY = rimY - g.h;
      veil.style.transform = `translate3d(0, ${shiftY.toFixed(2)}px, 0)`;
    }

    if (rimObj) {
      rimObj.setSpot(sweepT);
    }

    // Task 3: Lens v2 — velocity-gated, decays to 0 within ~250ms when scrolling stops
    let intensity = 0;
    if (lensObj) {
      intensity = lensObj.update(rimY, velocitySmoothed);
    }

    // 4.4: Act 3 (60-80%) settle: headline 6px overshoot settle, orbit beat, staggered rise
    const settleT = easeOut(ramp(p, 0.58, 0.72));
    if (title) {
      // Overshoot +6px at settleT ~ 0.5 then settle to 0
      const overshoot = Math.sin(settleT * Math.PI) * -6 * (1 - settleT);
      title.style.transform = `translate3d(0, ${overshoot.toFixed(2)}px, 0)`;
    }

    if (p >= 0.62 && !settledTriggered) {
      settledTriggered = true;
      section.classList.add('is-settled');
      triggerOrbitBeat();
      startIdleBeats();
    } else if (p < 0.50 && settledTriggered) {
      settledTriggered = false;
      section.classList.remove('is-settled');
    }

    // Staggered rise (12px, 90ms-equivalent scroll stagger) for orbit, eyebrow, subtitle, actions, footer
    settleTargets.forEach((el, i) => {
      const start = i === settleTargets.length - 1 ? 0.78 : 0.60 + i * 0.04;
      const val = easeOut(ramp(p, start, start + 0.12));
      el.style.opacity = String(val);
      el.style.transform = `translate3d(0, ${(12 * (1 - val)).toFixed(2)}px, 0)`;
      el.inert = val < 0.95;
    });

    // 4.5: Nav switches to dark glass when rim passes nav center line
    const dark = rimY < g.navBottom;
    if (lastDark !== dark) {
      lastDark = dark;
      section.dataset.arcDark = String(dark);
      if (currentScrollY >= g.top - g.navBottom && currentScrollY <= g.top + g.height) {
        header?.classList.toggle('on-dark', dark);
        header?.classList.toggle('closing-nav-dark', dark);
      }
    }
    if (currentScrollY < g.top - g.navBottom || currentScrollY > g.top + g.height) {
      header?.classList.remove('closing-nav-dark');
    }

    section.dataset.progress = p.toFixed(4);
    return intensity;
  }

  function stepSpring(now) {
    springRaf = 0;
    if (!visible || isUnpinned() || document.hidden || !geometry) return;
    const dt = lastTickTime ? Math.min(0.05, Math.max(0.001, (now - lastTickTime) / 1000)) : 0.016;
    lastTickTime = now;

    // Exponential decay of velocity (120ms time constant -> decays to 0 within ~250ms at rest)
    const decay = Math.exp(-dt / 0.12);
    velocitySmoothed *= decay;
    if (velocitySmoothed < 0.01) velocitySmoothed = 0;

    renderedP = spring ? spring.step(targetP, dt) : targetP;
    const intensity = render(renderedP, window.scrollY || 0);
    if (qualityMon) qualityMon.sample(now, intensity > 0);

    if (Math.abs(renderedP - targetP) > 0.0005 || velocitySmoothed > 0.01) {
      springRaf = requestAnimationFrame(stepSpring);
    } else {
      lastTickTime = 0;
    }
  }

  function onScrollFrame(y, nowArg) {
    if (!visible || isUnpinned() || document.hidden || !geometry) return;
    const now = nowArg || performance.now();
    const dtSec = lastScrollTime ? Math.max(0.004, (now - lastScrollTime) / 1000) : 0.016;
    const dy = Math.abs(y - lastScrollY);
    if (dy > 0.5) {
      const instVel = clamp((dy / dtSec) / 600);
      const alpha = 1 - Math.exp(-dtSec / 0.12);
      velocitySmoothed = velocitySmoothed + (instVel - velocitySmoothed) * alpha;
    }
    lastScrollY = y;
    lastScrollTime = now;

    targetP = clamp((y - geometry.top) / geometry.travel);

    if (CTA_SOFT_SNAP && !isUnpinned()) {
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const g = geometry;
        if (!g) return;
        const rimY = g.h * (0.90 - 1.15 * ramp(targetP, 0, 0.60));
        if (Math.abs(rimY - g.titleCenterY) <= g.h * 0.12) {
          const cleanP = clamp(((g.titleCenterY - 80) / g.h - 0.90) / -1.15) * 0.60;
          window.scrollTo({ top: Math.round(g.top + g.travel * cleanP), behavior: 'smooth' });
        }
      }, 250);
    }

    if (!springRaf) {
      lastTickTime = now;
      springRaf = requestAnimationFrame(stepSpring);
    }
  }

  function configure() {
    const unpinned = isUnpinned();
    section.classList.toggle('liquid-ready', !unpinned);
    measure();
    if (unpinned) {
      if (springRaf) { cancelAnimationFrame(springRaf); springRaf = 0; }
      if (lensObj) lensObj.update(-9999);
      if (veil) veil.style.transform = '';
      if (title) title.style.transform = 'none';
      settleTargets.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; el.inert = false; });
      section.dataset.arcDark = 'true';
      section.classList.add('is-settled');
      header?.classList.remove('closing-nav-dark');
    } else {
      const y = window.scrollY || 0;
      targetP = clamp((y - geometry.top) / geometry.travel);
      renderedP = spring ? spring.snap(targetP) : targetP;
      render(renderedP, y);
    }
  }

  window.__setClosingProgress = (val) => {
    targetP = clamp(val);
    renderedP = spring ? spring.snap(targetP) : targetP;
    render(renderedP, window.scrollY || 0);
  };

  const syncActiveState = () => {
    const active = visible && !media.matches && !document.hidden;
    section.classList.toggle('is-active', active);
    if (!active) stopIdleBeats();
    else if (settledTriggered) startIdleBeats();
  };

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncActiveState();
    if (visible) {
      measure();
      onScrollFrame(window.scrollY || 0);
    } else {
      header?.classList.remove('closing-nav-dark');
    }
  });
  observer.observe(stage);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measure(); configure(); });
  }
  window.addEventListener('load', () => { measure(); configure(); }, { once: true });

  if (window.TitanMotion) {
    window.TitanMotion.onScroll(onScrollFrame);
    window.TitanMotion.onResize(() => { measure(); onScrollFrame(window.scrollY || 0); });
  } else {
    addEventListener('scroll', () => onScrollFrame(window.scrollY || 0), { passive: true });
    addEventListener('resize', measure, { passive: true });
  }

  document.addEventListener('visibilitychange', syncActiveState);
  media.addEventListener('change', configure);
  mobileMQ.addEventListener('change', configure);

  // Pointer-following specular highlight on fine pointers only
  const actions = section.querySelector('.closing-actions');
  actions?.addEventListener('pointermove', event => {
    if (media.matches || coarseMQ.matches || event.pointerType === 'touch') return;
    const button = event.target.closest('.button-dark');
    if (button) {
      const b = button.getBoundingClientRect();
      button.style.setProperty('--pointer-x', `${event.clientX - b.left}px`);
      button.style.setProperty('--pointer-y', `${event.clientY - b.top}px`);
    }
  });

  configure();
})();
