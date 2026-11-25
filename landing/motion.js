/**
 * Titan AI — Single Motion System (motion.js)
 * - Shared flags: reducedMotion, coarsePointer
 * - Single IntersectionObserver (threshold: 0.2) for reveal-on-scroll
 * - Single rAF scroll-progress controller with ResizeObserver & document.hidden pause
 * - Adaptive 3-tier frame-time monitor (never upgrades back up within a session)
 */
(() => {
  'use strict';

  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarseMQ = window.matchMedia('(pointer: coarse)');

  const listeners = new Set();
  const scrollTasks = new Set();
  const resizeTasks = new Set();

  let scrollRaf = 0;
  let scrollDirty = false;

  const Motion = {
    durations: Object.freeze({
      fast: 120,
      ui: 200,
      enter: 320,
      hero: 600
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
    /**
     * Adaptive quality monitor over the first 30 active frames.
     * Tier 1: full effect (>=50fps)
     * Tier 2: half displacement/blur
     * Tier 3: static final state + crossfade
     */
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
    root.classList.toggle('is-reduced-motion', reducedMQ.matches);
    root.classList.toggle('is-coarse-pointer', coarseMQ.matches);
    document.body && document.body.classList.toggle('is-hidden', document.hidden);
    listeners.forEach(fn => {
      try { fn({ reducedMotion: reducedMQ.matches, coarsePointer: coarseMQ.matches }); } catch (_) {}
    });
  };

  reducedMQ.addEventListener('change', syncRootClasses);
  coarseMQ.addEventListener('change', syncRootClasses);
  document.addEventListener('visibilitychange', () => {
    document.body && document.body.classList.toggle('is-hidden', document.hidden);
    if (!document.hidden && scrollDirty) scheduleScrollTick();
  });

  // Single reveal-on-scroll IntersectionObserver (threshold: 0.2, reveal once)
  const initReveals = () => {
    const revealEls = document.querySelectorAll('.reveal, .pop-card');
    if (!revealEls.length) return;

    if (reducedMQ.matches || !('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('visible'));
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -24px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  };

  // Single rAF scroll-progress loop
  const runScrollTick = (time) => {
    scrollRaf = 0;
    if (document.hidden) return;
    scrollDirty = false;
    const y = window.scrollY || window.pageYOffset || 0;
    scrollTasks.forEach(fn => {
      try { fn(y, time); } catch (_) {}
    });
  };

  function scheduleScrollTick() {
    scrollDirty = true;
    if (!scrollRaf && !document.hidden) {
      scrollRaf = window.requestAnimationFrame(runScrollTick);
    }
  }

  window.addEventListener('scroll', scheduleScrollTick, { passive: true });
  window.addEventListener('resize', () => {
    resizeTasks.forEach(fn => { try { fn(); } catch (_) {} });
    scheduleScrollTick();
  }, { passive: true });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      resizeTasks.forEach(fn => { try { fn(); } catch (_) {} });
    });
    if (document.body) ro.observe(document.body);
    else document.addEventListener('DOMContentLoaded', () => ro.observe(document.body));
  }

  window.TitanMotion = Motion;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncRootClasses();
      initReveals();
    });
  } else {
    syncRootClasses();
    initReveals();
  }
})();
