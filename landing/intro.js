(() => {
  const T = { merge: 1000, beat: 700, beats: 2, fly: 800, lift: 750, liftAt: 600, heroDelay: 375 };
  const root = document.documentElement;
  const mark = document.querySelector('.mark-slot [data-titan-mark]') || document.querySelector('[data-titan-mark]');
  const slot = mark?.closest('.mark-slot') || mark?.parentElement;
  const ov = document.getElementById('ov');
  const clear = () => root.classList.remove('intro-nav', 'intro-hero', 'playing', 'locked');
  if (!mark || !slot || !ov) { clear(); return; }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  let anims = [];
  let token = 0;

  let introEndedDispatched = false;
  const emitIntroEnd = () => {
    if (introEndedDispatched) return;
    introEndedDispatched = true;
    console.log('[Titan Intro] finished — emitting titan:intro-end');
    window.dispatchEvent(new CustomEvent('titan:intro-end'));
  };

  function end(immediate = false) {
    token++;
    if (immediate && root.classList.contains('playing')) {
      const fade = ov.animate([{ opacity: getComputedStyle(ov).opacity || 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out', fill: 'forwards' });
      anims.forEach(a => { try { a.cancel(); } catch (_) { } });
      anims = [];
      mark.style.transform = '';
      mark.classList.remove('merge', 'spin');
      root.classList.remove('intro-nav', 'intro-hero', 'locked');
      fade.finished.catch(() => { }).finally(() => {
        try { fade.cancel(); } catch (_) { }
        root.classList.remove('playing');
        root.style.removeProperty('--big');
        emitIntroEnd();
      });
      return;
    }
    anims.forEach(a => { try { a.cancel(); } catch (_) { } });
    anims = [];
    mark.style.transform = '';
    mark.classList.remove('merge', 'spin');
    root.style.removeProperty('--big');
    clear();
  }

  function shouldPlay(force) {
    if (force) return true;
    // Always play — no storage, no scroll position, no motion preference check.
    // The head script already calls scrollTo(0,0); prefers-reduced-motion
    // is handled by CSS (the animation still runs but users never see lag).
    // Keeping only the ?intro=0 escape hatch for debugging.
    const params = new URLSearchParams(location.search);
    if (params.get('intro') === '0') return false; // explicit opt-out only
    return true;
  }

  async function play(force = false) {
    console.log('[Titan Intro] play() called, force=', force);
    end();
    if (!shouldPlay(force)) {
      console.log('[Titan Intro] shouldPlay=false, skipping');
      clear();
      emitIntroEnd();
      return;
    }
    const my = token;
    const alive = () => my === token;
    root.classList.add('intro-nav', 'intro-hero', 'playing', 'locked');
    console.log('[Titan Intro] visible=true, animation starting');

    const startTime = performance.now();
    await Promise.race([document.fonts.ready, wait(600)]);
    if (!alive()) return;
    if (!force && performance.now() - startTime > 1500) {
      console.log('[Titan Intro] SKIPPED — fonts took >1.5s to load');
      end();
      return;
    }

    const big = innerWidth < 700 ? 140 : 220;
    const k = 30 / big;
    root.style.setProperty('--big', `${big}px`);
    const r = slot.getBoundingClientRect();
    const dx = innerWidth / 2 - big / 2 - r.left;
    const dy = innerHeight / 2 - big / 2 - r.top;

    mark.style.transform = `translate(${dx}px, ${dy}px)`;
    mark.style.setProperty('--beat', `${T.beat}ms`);
    mark.style.setProperty('--beats', String(T.beats));

    mark.classList.add('merge');
    await wait(T.merge);
    if (!alive()) return;

    mark.classList.replace('merge', 'spin');
    await wait(T.beat * T.beats + 120);
    if (!alive()) return;

    mark.classList.remove('spin');
    root.classList.remove('locked');

    const fly = mark.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(1)` },
        { transform: `translate(-2.1px, -2.1px) scale(${k * 1.14})`, offset: 0.82 },
        { transform: `translate(0px, 0px) scale(${k})` }
      ],
      { duration: T.fly, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
    );
    mark.style.transform = '';
    anims.push(fly);

    await wait(T.liftAt);
    if (!alive()) return;

    const lift = ov.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(calc(-100% - 4vh))' }],
      { duration: T.lift, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
    );
    anims.push(lift);

    const heroTimer = setTimeout(() => {
      if (alive()) root.classList.remove('intro-hero');
    }, T.heroDelay);

    await fly.finished.catch(() => { });
    if (!alive()) { clearTimeout(heroTimer); return; }

    root.classList.remove('intro-nav');
    await lift.finished.catch(() => { });
    clearTimeout(heroTimer);
    if (!alive()) return;

    root.classList.remove('intro-hero');
    end();
    emitIntroEnd();
  }

  ['pointerdown', 'keydown', 'wheel', 'touchmove', 'resize'].forEach(evt =>
    addEventListener(evt, () => {
      if (root.classList.contains('playing')) end(true);
    }, { passive: true })
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && root.classList.contains('playing')) end(true);
  });

  window.playTitanIntro = () => play(true);
  play();

  // Fix bfcache restore: when Chrome/Edge restores the page from the
  // back/forward cache, scripts don't re-run, so we must restart the intro
  // explicitly when event.persisted is true.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      console.log('[Titan Intro] pageshow persisted (bfcache restore) — restarting intro');
      introEndedDispatched = false;
      anims = [];
      root.style.removeProperty('--big');
      root.classList.add('intro-nav', 'intro-hero', 'playing', 'locked');
      play(false);
    }
  });
})();
