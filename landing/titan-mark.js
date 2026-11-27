/**
 * TitanMark — Single reusable orbit mark component (vanilla JS)
 * Props / options:
 *   size: number (px)
 *   mode: "still" | "merge" | "spin" | "load"
 *   className: string
 *   decorative: boolean (true when next to "TITAN AI" text -> aria-hidden="true")
 */
(() => {
  'use strict';

  const SVG_INNER =
    '<g class="orbit">' +
      '<circle class="track" cx="24" cy="24" r="17"/>' +
      '<g class="sat" style="--a:-90deg;--i:0"><circle class="ring" cx="24" cy="24" r="4"/><circle class="dot" cx="24" cy="24" r="4"/></g>' +
      '<g class="sat" style="--a:30deg;--i:1"><circle class="ring" cx="24" cy="24" r="4"/><circle class="dot" cx="24" cy="24" r="4"/></g>' +
      '<g class="sat" style="--a:150deg;--i:2"><circle class="ring" cx="24" cy="24" r="4"/><circle class="dot" cx="24" cy="24" r="4"/></g>' +
    '</g>' +
    '<circle class="core" cx="24" cy="24" r="7"/>';

  const MODES = new Set(['still', 'merge', 'spin', 'load']);
  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loopRegistry = new Map(); // svg -> mode

  function createTitanMark(opts = {}) {
    const size = Number(opts.size) || 28;
    const rawMode = MODES.has(opts.mode) ? opts.mode : 'still';
    const mode = reducedMQ.matches ? 'still' : rawMode;
    const decorative = Boolean(opts.decorative);
    const extraClass = opts.className ? String(opts.className).trim() : '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const classes = ['titan'];
    if (size <= 24) classes.push('sm');
    if (mode !== 'still') classes.push(mode);
    if (extraClass) classes.push(extraClass);

    svg.setAttribute('class', classes.join(' '));
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));

    if (decorative) {
      svg.setAttribute('aria-hidden', 'true');
    } else {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Titan AI');
    }

    svg.innerHTML = SVG_INNER;
    svg.dataset.titanMode = rawMode;

    if (rawMode === 'spin' || rawMode === 'load') {
      registerLoop(svg, rawMode);
    }

    return svg;
  }

  function setTitanMode(svg, nextMode) {
    if (!svg) return;
    const mode = MODES.has(nextMode) ? nextMode : 'still';
    svg.classList.remove('merge', 'spin', 'load');
    svg.dataset.titanMode = mode;
    if (!reducedMQ.matches && !document.hidden && mode !== 'still') {
      svg.classList.add(mode);
    }
    if (mode === 'spin' || mode === 'load') {
      registerLoop(svg, mode);
    } else {
      loopRegistry.delete(svg);
    }
  }

  let loopObserver = null;
  function ensureObserver() {
    if (loopObserver || !('IntersectionObserver' in window)) return;
    loopObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const svg = entry.target;
        const mode = loopRegistry.get(svg);
        if (!mode) return;
        const active = entry.isIntersecting && !document.hidden && !reducedMQ.matches;
        svg.classList.toggle(mode, active);
      });
    }, { threshold: 0.05 });
  }

  function registerLoop(svg, mode) {
    loopRegistry.set(svg, mode);
    ensureObserver();
    if (loopObserver) loopObserver.observe(svg);
  }

  document.addEventListener('visibilitychange', () => {
    loopRegistry.forEach((mode, svg) => {
      svg.classList.toggle(mode, !document.hidden && !reducedMQ.matches);
    });
  });

  // Hydrate all [data-titan-mark] placeholders
  function hydrateMarks() {
    document.querySelectorAll('[data-titan-mark]').forEach(host => {
      if (host.tagName.toLowerCase() === 'svg') return;
      if (host.dataset.hydrated === '1') return;
      host.dataset.hydrated = '1';
      const size = Number(host.getAttribute('data-size')) || 28;
      const mode = host.getAttribute('data-mode') || 'still';
      const decorative = host.getAttribute('data-decorative') !== 'false';
      const className = host.getAttribute('data-class') || '';

      const svg = createTitanMark({ size, mode, decorative, className });
      host.replaceChildren(svg);

      if (mode === 'merge' && !reducedMQ.matches) {
        setTimeout(() => {
          setTitanMode(svg, 'still');
        }, 1250);
      }
    });
  }

  // Short-wait spinner on "Launch Titan AI" buttons
  function bindLaunchLoaders() {
    document.querySelectorAll('a.nav-cta, a.mobile-nav-cta, #closing .closing-actions a.button-dark').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-busy') === 'true') return;
        btn.setAttribute('aria-busy', 'true');
        const arrow = btn.querySelector('span[aria-hidden="true"]');
        const spinner = createTitanMark({ size: 18, mode: 'spin', decorative: false });
        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = 'Loading';
        if (arrow) {
          arrow.replaceWith(spinner);
        } else {
          btn.appendChild(spinner);
        }
        btn.appendChild(sr);
      });
    });
  }

  window.TitanMark = {
    create: createTitanMark,
    setMode: setTitanMode,
    hydrate: hydrateMarks
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hydrateMarks();
      bindLaunchLoaders();
    });
  } else {
    hydrateMarks();
    bindLaunchLoaders();
  }
})();
