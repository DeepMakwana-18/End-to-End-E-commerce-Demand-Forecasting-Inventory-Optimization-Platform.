(() => {
  const INTRO_MODE = window.TITAN_INTRO_MODE || 'always';   // 'always' | 'session' | 'off'
  const INTRO_THEME = window.TITAN_INTRO_THEME || 'dark';   // 'dark' | 'light'
  const T = {
    hold: 150,
    merge: 1000,
    beat: 700,
    beats: 2,
    anticipation: 80,
    fly: 820,
    liftDelayAfterFlight: 250, // lift starts at 2800ms (2550 + 250)
    lift: 900,
    navReveal: 260,
    scrollLockMs: 1450
  };
  const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

  const root = document.documentElement;
  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mark = document.querySelector('.mark-slot [data-titan-mark]') || document.querySelector('.mark-slot .titan');
  const slot = mark?.closest('.mark-slot') || mark?.parentElement;
  const ov = document.getElementById('ov');
  const introMark = document.getElementById('intro-mark');
  const introSvg = introMark?.querySelector('.titan');
  const whiteMark = document.getElementById('intro-mark-white');
  const whiteSvg = whiteMark?.querySelector('.titan');
  const heroTitle = document.getElementById('hero-title');
  const heroCopy = document.querySelector('#top .hero-compare__copy');
  const heroLines = [...document.querySelectorAll('#hero-title [data-copy="without"] .hero-line > span')];

  const clear = () => root.classList.remove('intro-nav', 'intro-hero', 'playing');

  if (!mark || !slot || !ov || !introMark || !introSvg) { clear(); return; }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  let anims = [];
  let token = 0;
  let scrollLockTimer = null;
  let scrollLocked = false;
  let introEndedDispatched = false;
  let rimObj = null;
  let lensObj = null;
  let liftRaf = 0;

  const emitIntroEnd = () => {
    if (introEndedDispatched) return;
    introEndedDispatched = true;
    window.dispatchEvent(new CustomEvent('titan:intro-end'));
  };

  function preventScrollEvent(e) { if (scrollLocked) e.preventDefault(); }
  function preventScrollKey(e) { if (scrollLocked && SCROLL_KEYS.has(e.key)) e.preventDefault(); }

  function lockScrollForIntro() {
    if (scrollLocked) return;
    scrollLocked = true;
    window.addEventListener('wheel', preventScrollEvent, { passive: false });
    window.addEventListener('touchmove', preventScrollEvent, { passive: false });
    window.addEventListener('keydown', preventScrollKey, { capture: true });
    scrollLockTimer = setTimeout(releaseScrollLock, T.scrollLockMs);
  }

  function releaseScrollLock() {
    if (!scrollLocked) return;
    scrollLocked = false;
    if (scrollLockTimer) { clearTimeout(scrollLockTimer); scrollLockTimer = null; }
    window.removeEventListener('wheel', preventScrollEvent, { passive: false });
    window.removeEventListener('touchmove', preventScrollEvent, { passive: false });
    window.removeEventListener('keydown', preventScrollKey, { capture: true });
  }

  function handoffToNavMark() {
    mark.style.visibility = 'visible';
    introMark.style.display = 'none';
    if (whiteMark) whiteMark.style.display = 'none';
  }

  function cleanupEffects() {
    if (liftRaf) { cancelAnimationFrame(liftRaf); liftRaf = 0; }
    if (lensObj) { lensObj.destroy(); lensObj = null; }
    if (rimObj?.svg) { rimObj.svg.remove(); rimObj = null; }
    heroLines.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }

  function end(immediate = false) {
    token++;
    releaseScrollLock();
    if (immediate && root.classList.contains('playing')) {
      cleanupEffects();
      const fade = ov.animate([{ opacity: getComputedStyle(ov).opacity || 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out', fill: 'forwards' });
      const markFade = introMark.animate([{ opacity: getComputedStyle(introMark).opacity || 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out', fill: 'forwards' });
      const whiteFade = whiteMark ? whiteMark.animate([{ opacity: getComputedStyle(whiteMark).opacity || 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out', fill: 'forwards' }) : null;
      anims.forEach(a => { try { a.cancel(); } catch (_) {} });
      anims = [];
      introSvg.classList.remove('merge', 'spin');
      whiteSvg?.classList.remove('merge', 'spin');
      root.classList.remove('intro-nav', 'intro-hero');
      mark.style.visibility = 'visible';
      Promise.all([fade.finished, markFade.finished, whiteFade?.finished].filter(Boolean)).catch(() => {}).finally(() => {
        try { fade.cancel(); markFade.cancel(); whiteFade?.cancel(); } catch (_) {}
        introMark.remove();
        whiteMark?.remove();
        ov.remove();
        root.classList.remove('playing');
        emitIntroEnd();
      });
      return;
    }
    cleanupEffects();
    anims.forEach(a => { try { a.cancel(); } catch (_) {} });
    anims = [];
    introSvg.classList.remove('merge', 'spin');
    whiteSvg?.classList.remove('merge', 'spin');
    introMark.style.transform = '';
    introMark.style.clipPath = '';
    if (whiteMark) { whiteMark.style.transform = ''; whiteMark.style.clipPath = ''; }
    mark.style.visibility = '';
    clear();
  }

  function shouldPlay(force) {
    if (force) return true;
    if (INTRO_MODE === 'off') return false;
    if (reducedMQ.matches) return false;
    const params = new URLSearchParams(location.search);
    if (params.get('intro') === '0') return false;
    if (INTRO_MODE === 'session') {
      try { if (sessionStorage.getItem('titan_intro_played') === '1') return false; } catch (_) {}
    }
    return true;
  }

  function syncSvgs(action, arg) {
    [introSvg, whiteSvg].forEach(svg => {
      if (!svg) return;
      if (action === 'prop') svg.style.setProperty(arg[0], arg[1]);
      else if (action === 'add') svg.classList.add(arg);
      else if (action === 'replace') svg.classList.replace(arg[0], arg[1]);
      else if (action === 'remove') svg.classList.remove(arg);
    });
  }

  function buildFlightKeyframes(dx, dy, k, vh) {
    // Quadratic Bezier control point placed 12vh above midpoint, clamped to [dy, 0] so y never increases
    const cx = dx * 0.5;
    const cy = Math.max(dy, dy * 0.5 - 0.12 * vh);
    const steps = 14;
    const frames = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const omt = 1 - t;
      const x = 2 * omt * t * cx + t * t * dx;
      const y = 2 * omt * t * cy + t * t * dy;
      let sc;
      if (t <= 0.82) {
        const st = t / 0.82;
        sc = 0.94 + (k * 1.14 - 0.94) * st;
      } else {
        const st = (t - 0.82) / 0.18;
        sc = k * 1.14 + (k - k * 1.14) * st;
      }
      frames.push({
        offset: Number(t.toFixed(4)),
        transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})`
      });
    }
    return frames;
  }

  async function play(force = false) {
    end();
    if (!shouldPlay(force)) {
      clear();
      ov.remove();
      introMark.remove();
      whiteMark?.remove();
      emitIntroEnd();
      return;
    }
    if (INTRO_MODE === 'session') {
      try { sessionStorage.setItem('titan_intro_played', '1'); } catch (_) {}
    }

    const my = token;
    const alive = () => my === token;
    root.dataset.introTheme = INTRO_THEME;
    root.classList.add('intro-nav', 'intro-hero', 'playing');
    introMark.style.display = '';
    if (whiteMark && INTRO_THEME === 'dark') {
      whiteMark.style.display = '';
      whiteMark.style.clipPath = 'inset(0 0 0% 0)';
      introMark.style.clipPath = 'inset(100% 0 0 0)';
    }
    mark.style.visibility = 'hidden';

    if (window.TitanGlass) {
      rimObj = window.TitanGlass.createRimSvg();
      ov.appendChild(rimObj.svg);
      rimObj.setSpot(0);
    }

    lockScrollForIntro();
    syncSvgs('prop', ['--beat', `${T.beat}ms`]);
    syncSvgs('prop', ['--beats', String(T.beats)]);

    // 0-150ms hold
    await wait(T.hold);
    if (!alive()) return;

    // 150-1150ms merge
    syncSvgs('add', 'merge');
    await wait(T.merge);
    if (!alive()) return;

    // 1150-2550ms two spin beats
    syncSvgs('replace', ['merge', 'spin']);
    await wait(T.beat * T.beats);
    if (!alive()) return;
    syncSvgs('remove', 'spin');

    // 2550-2630ms anticipation (80ms, scale 1 -> 0.94, ease-out, zero Y dip)
    const antOpts = { duration: T.anticipation, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' };
    const antFrames = [{ transform: 'translate(0px, 0px) scale(1)' }, { transform: 'translate(0px, 0px) scale(0.94)' }];
    const antA = introMark.animate(antFrames, antOpts);
    anims.push(antA);
    if (whiteMark && INTRO_THEME === 'dark') anims.push(whiteMark.animate(antFrames, antOpts));

    await antA.finished.catch(() => {});
    if (!alive()) return;

    // 2630-3450ms Bezier flight (both sibling marks share exact transform)
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const big = introMark.getBoundingClientRect().width || (vw < 700 ? 140 : 220);
    const r = slot.getBoundingClientRect();
    const k = (r.width || 30) / big;
    const dx = (r.left + r.width / 2) - vw / 2;
    const dy = (r.top + r.height / 2) - vh / 2;

    const flyKeyframes = buildFlightKeyframes(dx, dy, k, vh);
    const flyOpts = { duration: T.fly, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' };
    const flyA = introMark.animate(flyKeyframes, flyOpts);
    anims.push(flyA);
    if (whiteMark && INTRO_THEME === 'dark') anims.push(whiteMark.animate(flyKeyframes, flyOpts));

    // Debug / verification telemetry hook
    const frameLog = [];
    window.__introFlightLog = frameLog;

    // Lift starts 250ms after flight starts (~2800ms)
    const qualityMon = window.TitanGlass ? window.TitanGlass.createQualityMonitor() : null;
    const ovHeight = ov.getBoundingClientRect().height || window.innerHeight * 1.24;
    const totalShift = ovHeight + window.innerHeight * 0.04;
    const bowlRyPx = vh * 0.14;
    const halfBowlW = vw * 0.75;
    const vcX = vw / 2;

    let liftStarted = false;
    let liftStart = 0;
    const flightStart = performance.now();

    if (window.TitanGlass && heroTitle && heroCopy) {
      lensObj = window.TitanGlass.createLens({ targetEl: heroTitle, containerEl: heroCopy, mode: 'multiply' });
      lensObj.measure();
    }
    const copyTop = heroCopy ? heroCopy.getBoundingClientRect().top : 0;
    const lineCenters = heroLines.map(span => {
      const lr = span.getBoundingClientRect();
      return lr.top + lr.height / 2;
    });
    const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const stepFrame = (now) => {
      if (!alive()) return;
      const elapsedFlight = now - flightStart;
      if (!liftStarted && elapsedFlight >= T.liftDelayAfterFlight - T.anticipation) {
        liftStarted = true;
        liftStart = now;
      }

      // 1 measurement of mark rect + 1 measurement of overlay bottom per frame
      const mr = introMark.getBoundingClientRect();
      const markCenterX = mr.left + mr.width / 2;
      const markCenterY = mr.top + mr.height / 2;
      if (mr.width > 0) {
        frameLog.push({ t: Math.round(elapsedFlight), x: Number(markCenterX.toFixed(2)), y: Number(markCenterY.toFixed(2)) });
      }

      let liftP = 0;
      if (liftStarted) {
        liftP = Math.min(1, (now - liftStart) / T.lift);
        const yPx = -totalShift * easeInOut(liftP);
        ov.style.transform = `translate3d(0, ${yPx.toFixed(2)}px, 0)`;
        if (rimObj) rimObj.setSpot(liftP);

        const ovBottom = ovHeight + yPx;
        const normX = Math.max(-1, Math.min(1, (markCenterX - vcX) / halfBowlW));
        const rimAtMarkX = ovBottom - bowlRyPx + bowlRyPx * Math.sqrt(Math.max(0, 1 - normX * normX));

        if (whiteMark && INTRO_THEME === 'dark') {
          const localY = Math.max(0, Math.min(mr.height, rimAtMarkX - mr.top));
          const pct = (localY / Math.max(1, mr.height)) * 100;
          whiteMark.style.clipPath = `inset(0 0 ${(100 - pct).toFixed(2)}% 0)`;
          introMark.style.clipPath = `inset(${pct.toFixed(2)}% 0 0 0)`;
        }

        const rimAtCenter = ovBottom;
        if (lensObj && heroCopy) {
          const intensity = lensObj.update(rimAtCenter - copyTop, 1);
          if (qualityMon) qualityMon.sample(now, intensity > 0);
        }
        heroLines.forEach((span, idx) => {
          if (rimAtCenter <= lineCenters[idx] + 24) {
            span.style.transform = 'translateY(0)';
          }
        });
      }

      if (!liftStarted || liftP < 1) {
        liftRaf = requestAnimationFrame(stepFrame);
      } else {
        liftRaf = 0;
      }
    };
    liftRaf = requestAnimationFrame(stepFrame);

    await flyA.finished.catch(() => {});
    if (!alive()) return;

    // Same-tick handoff to real nav mark + wordmark clip + nav fade-in
    handoffToNavMark();
    root.classList.remove('intro-nav', 'intro-hero');

    await wait(Math.max(T.navReveal, T.lift - (T.fly - (T.liftDelayAfterFlight - T.anticipation))));
    if (!alive()) return;

    end();
    introMark.remove();
    whiteMark?.remove();
    ov.remove();
    emitIntroEnd();
  }

  ['pointerdown', 'keydown', 'resize'].forEach(evt =>
    addEventListener(evt, () => {
      if (root.classList.contains('playing')) end(true);
    }, { passive: true })
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && root.classList.contains('playing')) end(true);
  });

  window.playTitanIntro = () => play(true);
  play();

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      introEndedDispatched = false;
      anims = [];
      play(false);
    }
  });
})();
