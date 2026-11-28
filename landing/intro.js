(() => {
  'use strict';

  // Tunable timing constants (ms)
  const TIMING = {
    reducedFadeMs: 300,     // prefers-reduced-motion fade
    assembleMs: 350,        // 0.00-0.35s: core overshoot + ring stroke draw + sat stagger
    satStaggerMs: 60,       // 60ms stagger between the 3 satellites
    orbitMs: 900,           // 0.35-1.25s: 360deg orbit + 100->108->100% breathe (min loader = 1.25s)
    handoffMs: 600,         // 1.25-1.85s: travel + scale to nav logo slot
    curtainAtMs: 1400,      // 1.40s: curved curtain exit starts
    curtainMs: 900,         // Give the glass edge time to read as it crosses the hero
    navPillAtMs: 1580,      // 1.85s: nav pill y -12->0 + fade (500ms)
    navPillMs: 500,
    tabsAtMs: 1570,         // 1.90s: Without/With tabs y 8->0 + fade
    tabsMs: 350,
    line1AtMs: 1560,        // 1.90s: headline line 1 masked reveal (700ms expo.out)
    line2AtMs: 1640,        // 2.00s: headline line 2 masked reveal (700ms expo.out)
    headlineMs: 700,
    wordmarkAtMs: 1600,     // 2.00s: wordmark clip-path left->right (350ms)
    wordmarkMs: 350,
    subheadAtMs: 1740,      // 2.20s: subhead y 12->0 + fade (500ms)
    subheadMs: 500,
    ctaAtMs: 1820,          // 2.30s: CTA scale .96->1 + fade (450ms)
    ctaMs: 450,
    mockupAtMs: 1880,       // 2.35s: spreadsheet mockup y 40->0 + fade (900ms)
    mockupMs: 900,
    rowStaggerMs: 20        // 20ms stagger across visible spreadsheet rows
  };

  const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const HANDOFF_EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
  const BACK_OUT = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  const POWER2_IO = 'cubic-bezier(0.65, 0, 0.35, 1)';
  const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMQ = window.matchMedia('(max-width: 799px)');
  const shouldBypassIntro = () =>
    params.get('intro') === '0' ||
    reducedMQ.matches ||
    mobileMQ.matches ||
    root.dataset.introMode === 'off' ||
    Boolean(location.hash && location.hash.length > 1);
  const ov = document.getElementById('ov');
  const ribbon = ov?.querySelector('.ov-blue-ribbon');
  const introMark = document.getElementById('intro-mark');
  const whiteMark = document.getElementById('intro-mark-white');
  const whiteSvg = whiteMark?.querySelector('.titan');
  const header = document.querySelector('.site-header');
  const wordmark = header?.querySelector('.word');
  const navMark = document.querySelector('.mark-slot [data-titan-mark]') || document.querySelector('.mark-slot .titan');
  const navSlot = navMark?.closest('.mark-slot') || navMark?.parentElement;

  const tabsEl = document.querySelector('#top .hero-compare__tabs');
  const lineSpans = [...document.querySelectorAll('#hero-title [data-copy="without"] .hero-line > span')];
  const dekEl = document.querySelector('#top .hero-compare__dek');
  const ctaEl = document.querySelector('#top .hero-compare__cta');
  const stageEl = document.querySelector('#top .hero-compare__stage');
  const sheetCells = [...document.querySelectorAll('#top [data-visual="without"] .hero-compare__cell')].slice(0, 56);

  const clearClasses = () => root.classList.remove('intro-nav', 'intro-hero', 'playing');
  if (!ov || !header || !navMark || !navSlot) { clearClasses(); return; }
  if (introMark) introMark.style.display = 'none';

  const wait = ms => new Promise(r => setTimeout(r, ms));
  let anims = [];
  let timers = [];
  let token = 0;
  let scrollLocked = false;
  let introEnded = false;

  const emitIntroEnd = () => {
    if (introEnded) return;
    introEnded = true;
    window.dispatchEvent(new CustomEvent('titan:intro-end'));
  };

  const preventScroll = e => { if (scrollLocked) e.preventDefault(); };
  const preventScrollKey = e => { if (scrollLocked && SCROLL_KEYS.has(e.key)) e.preventDefault(); };

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('keydown', preventScrollKey, { capture: true });
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    window.removeEventListener('wheel', preventScroll, { passive: false });
    window.removeEventListener('touchmove', preventScroll, { passive: false });
    window.removeEventListener('keydown', preventScrollKey, { capture: true });
  }

  function setWillChange(active) {
    const els = [ov, whiteMark, header, wordmark, tabsEl, ...lineSpans, dekEl, ctaEl, stageEl].filter(Boolean);
    els.forEach(el => {
      if (active) el.style.willChange = el === wordmark ? 'clip-path' : 'transform, opacity';
      else el.style.removeProperty('will-change');
    });
  }

  function cancelAll() {
    timers.forEach(id => clearTimeout(id));
    timers = [];
    anims.forEach(a => { try { a.cancel(); } catch (_) {} });
    anims = [];
  }

  function finishIntro() {
    cancelAll();
    unlockScroll();
    setWillChange(false);
    [ov, ribbon, whiteMark, header, wordmark, tabsEl, ...lineSpans, dekEl, ctaEl, stageEl, ...sheetCells].forEach(el => {
      if (!el) return;
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('clip-path');
    });
    ov.style.display = 'none';
    if (whiteMark) whiteMark.style.display = 'none';
    navMark.style.visibility = 'visible';
    clearClasses();
    emitIntroEnd();
  }

  function resetForReplay() {
    cancelAll();
    introEnded = false;
    [ov, ribbon, whiteMark, header, wordmark, tabsEl, ...lineSpans, dekEl, ctaEl, stageEl, ...sheetCells].forEach(el => {
      if (!el) return;
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('clip-path');
    });
    ov.style.display = '';
    if (whiteMark) whiteMark.style.display = '';
    root.classList.add('intro-nav', 'intro-hero', 'playing');
    navMark.style.visibility = 'hidden';
  }

  function anim(el, keyframes, options) {
    if (!el) return null;
    const a = el.animate(keyframes, Object.assign({ fill: 'both' }, options));
    anims.push(a);
    return a;
  }

  async function quickFade(durationMs) {
    const my = ++token;
    clearClasses();
    navMark.style.visibility = 'visible';
    if (whiteMark) whiteMark.style.display = 'none';
    const fade = anim(ov, [{ opacity: 1 }, { opacity: 0 }], { duration: durationMs, easing: 'ease-out', fill: 'forwards' });
    await fade?.finished.catch(() => {});
    if (my !== token) return;
    finishIntro();
  }

  function revealContentTimeline(baseOffsetMs = 0) {
    const sched = (atMs, fn) => {
      const delay = Math.max(0, atMs - baseOffsetMs);
      timers.push(setTimeout(fn, delay));
    };

    // 1.85s: nav pill y -12->0 + fade (500ms)
    sched(TIMING.navPillAtMs, () => {
      root.classList.remove('intro-nav');
      header.style.opacity = '1';
      header.style.transform = 'translateY(0)';
      anim(header, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: TIMING.navPillMs,
        easing: EXPO_OUT
      });
    });

    // 2.00s: wordmark clip-path left->right (350ms, no typewriter)
    sched(TIMING.wordmarkAtMs, () => {
      if (!wordmark) return;
      anim(wordmark, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
        duration: TIMING.wordmarkMs,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
      });
    });

    // 1.90s: Without/With tabs y 8->0 + fade
    sched(TIMING.tabsAtMs, () => {
      if (!tabsEl) return;
      anim(tabsEl, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: TIMING.tabsMs,
        easing: EXPO_OUT
      });
    });

    // 1.90s line 1, 2.00s line 2: masked line reveal (after fonts.ready)
    sched(TIMING.line1AtMs, () => {
      if (lineSpans[0]) {
        anim(lineSpans[0], [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], {
          duration: TIMING.headlineMs,
          easing: EXPO_OUT
        });
      }
    });
    sched(TIMING.line2AtMs, () => {
      if (lineSpans[1]) {
        anim(lineSpans[1], [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], {
          duration: TIMING.headlineMs,
          easing: EXPO_OUT
        });
      }
    });

    // 2.20s: subhead y 12->0 + fade (500ms)
    sched(TIMING.subheadAtMs, () => {
      if (!dekEl) return;
      anim(dekEl, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: TIMING.subheadMs,
        easing: EXPO_OUT
      });
    });

    // 2.30s: CTA scale .96->1 + fade (450ms, final blue from frame 1)
    sched(TIMING.ctaAtMs, () => {
      if (!ctaEl) return;
      anim(ctaEl, [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'scale(1)' }], {
        duration: TIMING.ctaMs,
        easing: EXPO_OUT
      });
    });

    // 2.35s: spreadsheet mockup y 40->0 + fade (900ms, rows staggered 20ms)
    sched(TIMING.mockupAtMs, () => {
      if (stageEl) {
        anim(stageEl, [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'translateY(0)' }], {
          duration: TIMING.mockupMs,
          easing: EXPO_OUT
        });
      }
      sheetCells.forEach((cell, idx) => {
        const row = Math.floor(idx / 8);
        anim(cell, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], {
          duration: 320,
          delay: row * TIMING.rowStaggerMs,
          easing: EXPO_OUT
        });
      });
    });
  }

  async function playIntro() {
    if (shouldBypassIntro()) {
      finishIntro();
      return;
    }

    const my = ++token;
    const alive = () => my === token;

    resetForReplay();

    lockScroll();
    setWillChange(true);

    // Wait for fonts at DOMContentLoaded before starting timeline
    if (document.fonts) {
      await Promise.race([document.fonts.ready, wait(800)]);
      if (!alive()) return;
    }

    const core = whiteSvg?.querySelector('.core');
    const track = whiteSvg?.querySelector('.track');
    const orbit = whiteSvg?.querySelector('.orbit');
    const sats = [...(whiteSvg?.querySelectorAll('.sat') || [])];
    const satAngles = [-90, 30, 150];

    // Core pop, ring draw, and three satellite arrivals.
    if (track) {
      const len = 2 * Math.PI * 17;
      track.style.strokeDasharray = `${len.toFixed(2)}`;
      track.style.strokeDashoffset = `${len.toFixed(2)}`;
      anim(track, [{ strokeDashoffset: len, opacity: 0 }, { strokeDashoffset: 0, opacity: 0.28 }], {
        duration: TIMING.assembleMs,
        easing: EXPO_OUT
      });
    }
    if (core) {
      anim(core, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], {
        duration: TIMING.assembleMs,
        easing: BACK_OUT
      });
    }
    sats.forEach((sat, i) => {
      const a = `${satAngles[i]}deg`;
      anim(sat, [
        { opacity: 0, transform: `rotate(${a}) translateX(17px) scale(0.4)` },
        { opacity: 1, transform: `rotate(${a}) translateX(17px) scale(1)` }
      ], {
        duration: TIMING.assembleMs - i * TIMING.satStaggerMs,
        delay: i * TIMING.satStaggerMs,
        easing: BACK_OUT
      });
    });
    await wait(TIMING.assembleMs);
    if (!alive()) return;

    // One complete orbit + 100->108->100% breathe.
    const orbitAnim = anim(orbit, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: TIMING.orbitMs,
      easing: POWER2_IO
    });
    sats.forEach((sat, i) => {
      const a = `${satAngles[i]}deg`;
      anim(sat, [
        { transform: `rotate(${a}) translateX(17px) scale(1)` },
        { transform: `rotate(${a}) translateX(18.36px) scale(1)`, offset: 0.5 },
        { transform: `rotate(${a}) translateX(17px) scale(1)` }
      ], {
        duration: TIMING.orbitMs,
        easing: POWER2_IO
      });
    });

    await Promise.all([orbitAnim?.finished.catch(() => {}), wait(TIMING.orbitMs)]);
    if (!alive()) return;

    // 1.25-1.85s: Handoff — measure navSlot with getBoundingClientRect, travel & scale in 0.6s
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const big = whiteMark?.getBoundingClientRect().width || 220;
    const sr = navSlot.getBoundingClientRect();
    const k = (sr.width || 30) / big;
    const dx = (sr.left + sr.width / 2) - vw / 2;
    const dy = (sr.top + sr.height / 2) - vh / 2;

    const handoffAnim = anim(whiteMark, [
      { transform: 'translate(0px, 0px) scale(1)' },
      { transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${k.toFixed(4)})` }
    ], {
      duration: TIMING.handoffMs,
      easing: HANDOFF_EASE
    });

    // 1.40-2.10s: Curtain exits with curved edge (expo.out) + CTA-blue ribbon fading out
    const curtainDelay = TIMING.curtainAtMs - (TIMING.assembleMs + TIMING.orbitMs);
    timers.push(setTimeout(() => {
      if (!alive()) return;
      anim(ov, [{ transform: 'translateY(0)' }, { transform: 'translateY(calc(-100% - 4vh))' }], {
        duration: TIMING.curtainMs,
        easing: EXPO_OUT
      });
      if (ribbon) {
        anim(ribbon, [{ opacity: 0.35 }, { opacity: 0 }], {
          duration: TIMING.curtainMs,
          easing: 'ease-out'
        });
      }
    }, Math.max(0, curtainDelay)));

    revealContentTimeline(TIMING.assembleMs + TIMING.orbitMs);

    await handoffAnim?.finished.catch(() => {});
    if (!alive()) return;

    // 1.85s: Exact handoff to nav mark
    navMark.style.visibility = 'visible';
    if (whiteMark) whiteMark.style.display = 'none';

    await wait(Math.max(0, (TIMING.mockupAtMs + TIMING.mockupMs) - (TIMING.assembleMs + TIMING.orbitMs + TIMING.handoffMs)));
    if (!alive()) return;

    finishIntro();
  }

  window.playIntro = playIntro;
  window.playTitanIntro = playIntro;

  ['pointerdown', 'keydown', 'resize'].forEach(evt =>
    addEventListener(evt, () => {
      if (root.classList.contains('playing')) {
        token++;
        finishIntro();
      }
    }, { passive: true })
  );

  // Replay on bfcache restore only when intro isn't bypassed and page is at top
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && !shouldBypassIntro() && window.scrollY < 4) {
      playIntro();
    } else if (event.persisted && shouldBypassIntro()) {
      finishIntro();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', playIntro, { once: true });
  } else {
    playIntro();
  }
})();
