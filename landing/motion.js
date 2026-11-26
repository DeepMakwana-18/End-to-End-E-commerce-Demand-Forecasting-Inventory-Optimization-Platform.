/**
 * Titan AI — Single Motion System (motion.js)
 * - Shared flags: reducedMotion, coarsePointer
 * - Single passive scroll listener storing scrollY + single rAF read/write loop
 * - Cached layout geometry refreshed on resize / ResizeObserver (no layout reads in scroll)
 * - IO-gated heading reveals (0px 0px -8% 0px, 450ms) and arc boundary depth
 * - Adaptive 3-tier frame-time monitor
 */
(() => {
  'use strict';

  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarseMQ = window.matchMedia('(pointer: coarse)');

  const listeners = new Set();
  const scrollTasks = new Set();
  const resizeTasks = new Set();

  let scrollRaf = 0;
  let latestScrollY = window.scrollY || window.pageYOffset || 0;
  let cachedDocScrollable = 1;
  let cachedVH = window.innerHeight || 900;

  const Motion = {
    durations: Object.freeze({
      fast: 120,
      ui: 200,
      enter: 320,
      hero: 600,
      slow: 900
    }),
    easings: Object.freeze({
      out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      inOut: 'cubic-bezier(0.65, 0, 0.35, 1)'
    }),
    get reducedMotion() {
      return reducedMQ.matches;
    },
    get coarsePointer() {
      return coarseMQ.matches;
    },
    onEnvChange(fn) {
      if (typeof fn === 'function') listeners.add(fn);
      return () => listeners.delete(fn);
    },
    onScroll(fn) {
      if (typeof fn === 'function') scrollTasks.add(fn);
      return () => scrollTasks.delete(fn);
    },
    onResize(fn) {
      if (typeof fn === 'function') resizeTasks.add(fn);
      return () => resizeTasks.delete(fn);
    },
    createAdaptiveMonitor(onTierChange) {
      let tier = 1;
      let frameCount = 0;
      let slowFrames = 0;
      let lastTime = 0;

      return {
        get tier() { return tier; },
        resetClock() { lastTime = 0; },
        sample(now, isActive) {
          if (!isActive || tier === 3) {
            lastTime = 0;
            return tier;
          }
          if (lastTime > 0) {
            const dt = now - lastTime;
            if (dt > 20 && dt < 250) slowFrames++;
            frameCount++;
            if (frameCount >= 30) {
              if (slowFrames >= 12 && tier < 3) {
                tier = 3;
                onTierChange(tier);
              } else if (slowFrames >= 5 && tier < 2) {
                tier = 2;
                onTierChange(tier);
              }
              frameCount = 0;
              slowFrames = 0;
            }
          }
          lastTime = now;
          return tier;
        }
      };
    }
  };

  const syncRootClasses = () => {
    const root = document.documentElement;
    window.reducedMotion = reducedMQ.matches;
    root.classList.toggle('is-reduced-motion', reducedMQ.matches);
    root.classList.toggle('is-coarse-pointer', coarseMQ.matches);
    if (document.body) document.body.classList.toggle('is-hidden', document.hidden);
    listeners.forEach(fn => {
      try { fn({ reducedMotion: reducedMQ.matches, coarsePointer: coarseMQ.matches }); } catch (_) {}
    });
  };

  reducedMQ.addEventListener('change', syncRootClasses);
  coarseMQ.addEventListener('change', syncRootClasses);
  document.addEventListener('visibilitychange', () => {
    if (document.body) document.body.classList.toggle('is-hidden', document.hidden);
    if (!document.hidden) scheduleScrollTick();
  });

  // D4: Section heading reveals (rootMargin: '0px 0px -8% 0px', threshold: 0, 450ms)
  const initReveals = () => {
    const headings = [...document.querySelectorAll('main > section:not(#top):not(#closing) h2')];
    document.querySelectorAll('.reveal, .pop-card').forEach(el => el.classList.add('visible'));
    if (!headings.length) return;

    headings.forEach(h => h.classList.add('titan-heading-mask'));

    if (reducedMQ.matches || !('IntersectionObserver' in window)) {
      headings.forEach(h => h.classList.add('is-revealed'));
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

    headings.forEach(h => revealObserver.observe(h));
  };

  // Single Demo Autoplay Controller (50% visible start, pause offscreen, max 1 active, stops on interaction)
  const demoRegistry = new Map();
  let activeDemoId = null;

  const demoObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const id = entry.target.id || entry.target.dataset.demoId;
          const ctrl = demoRegistry.get(id);
          if (!ctrl) return;
          ctrl.visible = entry.isIntersecting;
          if (entry.isIntersecting && !document.hidden && !reducedMQ.matches && !ctrl.userStopped && !ctrl.paused) {
            if (activeDemoId && activeDemoId !== id) {
              const prev = demoRegistry.get(activeDemoId);
              if (prev) prev.pause();
            }
            activeDemoId = id;
            ctrl.start();
          } else if (!entry.isIntersecting && activeDemoId === id) {
            ctrl.pause();
            activeDemoId = null;
          }
        });
      }, { threshold: 0.5 })
    : null;

  Motion.registerDemo = (id, el, { start, pause }) => {
    if (!el) return null;
    const ctrl = {
      id,
      el,
      visible: false,
      paused: false,
      userStopped: false,
      start: () => { if (!ctrl.paused && !ctrl.userStopped && !reducedMQ.matches) start(); },
      pause: () => { pause(); },
      stopByUser: () => {
        ctrl.userStopped = true;
        ctrl.paused = true;
        pause();
        if (activeDemoId === id) activeDemoId = null;
      }
    };
    demoRegistry.set(id, ctrl);
    if (demoObserver) demoObserver.observe(el);
    return ctrl;
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && activeDemoId) {
      const ctrl = demoRegistry.get(activeDemoId);
      if (ctrl) ctrl.pause();
    }
  });

  // D2 + D5: Cached geometry & IO-gated section boundary bowls (static on mobile/reduced-motion)
  let progressBar = null;
  let siteHeader = null;
  const arcTopCache = new Map();
  const visibleArcs = new Set();

  const measureGeometry = () => {
    const sy = window.scrollY || window.pageYOffset || 0;
    cachedVH = window.innerHeight || 900;
    cachedDocScrollable = Math.max(1, document.documentElement.scrollHeight - cachedVH);
    arcTopCache.forEach((_, sec) => {
      arcTopCache.set(sec, sec.getBoundingClientRect().top + sy);
    });
  };

  const runScrollTick = (time) => {
    scrollRaf = 0;
    if (document.hidden) return;
    const y = latestScrollY;

    // Pure writes using cached geometry (zero layout reads!)
    if (progressBar) {
      const pVal = Math.min(1, Math.max(0, y / cachedDocScrollable));
      progressBar.style.transformOrigin = '0 50%';
      progressBar.style.transform = `scaleX(${pVal.toFixed(4)})`;
    }
    if (siteHeader) {
      siteHeader.classList.toggle('scrolled', y > 80);
    }

    if (!supportsViewTimeline && !reducedMQ.matches && !coarseMQ.matches && window.innerWidth >= 768) {
      const endY = cachedVH * 0.4;
      const span = Math.max(1, cachedVH - endY);
      visibleArcs.forEach(sec => {
        const secTop = arcTopCache.get(sec);
        if (secTop === undefined) return;
        const viewportTop = secTop - y;
        const t = Math.max(0, Math.min(1, (cachedVH - viewportTop) / span));
        sec.style.setProperty('--arc-depth', (0.35 + 0.65 * t).toFixed(3));
      });
    }

    scrollTasks.forEach(fn => {
      try { fn(y, time); } catch (_) {}
    });
  };

  function scheduleScrollTick() {
    if (!scrollRaf && !document.hidden) {
      scrollRaf = window.requestAnimationFrame(runScrollTick);
    }
  }

  // Single passive scroll listener that ONLY stores scrollY
  window.addEventListener('scroll', () => {
    latestScrollY = window.scrollY || window.pageYOffset || 0;
    scheduleScrollTick();
  }, { passive: true });

  window.addEventListener('resize', () => {
    measureGeometry();
    resizeTasks.forEach(fn => { try { fn(); } catch (_) {} });
    scheduleScrollTick();
  }, { passive: true });

  if ('ResizeObserver' in window) {
    let roTimer = 0;
    const ro = new ResizeObserver(() => {
      if (roTimer) return;
      roTimer = requestAnimationFrame(() => {
        roTimer = 0;
        measureGeometry();
        resizeTasks.forEach(fn => { try { fn(); } catch (_) {} });
      });
    });
    if (document.body) ro.observe(document.body);
    else document.addEventListener('DOMContentLoaded', () => ro.observe(document.body));
  }

  const supportsViewTimeline = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: view()');

  const initOffscreenPause = () => {
    if (!('IntersectionObserver' in window)) return;
    const sections = [...document.querySelectorAll('main > section')];
    if (!sections.length) return;
    const offscreenObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    }, { rootMargin: '100px 0px 100px 0px', threshold: 0 });
    sections.forEach(sec => offscreenObs.observe(sec));
  };

  const initArcBoundaries = () => {
    const arcSections = [
      'titan-overview', 'use-cases', 'how', 'product',
      'planning-context', 'decision-trail', 'outputs', 'faq'
    ].map(id => document.getElementById(id)).filter(Boolean);
    if (!arcSections.length) return;
    if (supportsViewTimeline) {
      arcSections.forEach(s => s.style.setProperty('--arc-depth', '1'));
      return;
    }

    arcSections.forEach(sec => arcTopCache.set(sec, 0));
    measureGeometry();

    const syncStaticMobileOrReduced = () => {
      if (reducedMQ.matches || coarseMQ.matches || window.innerWidth < 768) {
        arcSections.forEach(s => s.style.setProperty('--arc-depth', '1'));
      }
    };
    syncStaticMobileOrReduced();
    Motion.onEnvChange(syncStaticMobileOrReduced);
    Motion.onResize(syncStaticMobileOrReduced);

    if ('IntersectionObserver' in window) {
      const arcObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) visibleArcs.add(entry.target);
          else visibleArcs.delete(entry.target);
        });
        scheduleScrollTick();
      }, { rootMargin: '80px 0px 80px 0px', threshold: 0 });
      arcSections.forEach(sec => arcObserver.observe(sec));
    } else {
      arcSections.forEach(sec => visibleArcs.add(sec));
    }
  };

  window.TitanMotion = Motion;

  const boot = () => {
    progressBar = document.querySelector('.progress');
    siteHeader = document.querySelector('[data-header]');
    syncRootClasses();
    initReveals();
    initOffscreenPause();
    initArcBoundaries();
    measureGeometry();
    runScrollTick(performance.now());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
