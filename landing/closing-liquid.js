(() => {
  'use strict';
  const section = document.querySelector('#closing');
  if (!section) return;
  const stage = section.querySelector('.closing-stage');
  const title = section.querySelector('h2');
  const header = document.querySelector('[data-header]');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const coarseMQ = matchMedia('(pointer: coarse)');
  const isUnpinned = () => media.matches;

  let fallback = false;
  const adaptive = window.TitanMotion
    ? window.TitanMotion.createAdaptiveMonitor(tier => {
      if (tier >= 2) section.dataset.liquidTier = String(tier);
      if (tier === 3) { fallback = true; lens.classList.add('chromatic'); }
    })
    : null;
  section.dataset.liquidTier = '1';

  const clamp = v => Math.max(0, Math.min(1, v));
  const ramp = (p, start, end) => clamp((p - start) / Math.max(0.0001, end - start));
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const lens = document.createElement('div');
  lens.className = 'lens';
  lens.setAttribute('aria-hidden', 'true');
  lens.innerHTML = title.innerHTML;
  stage.append(lens);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  svg.innerHTML = `<defs><filter id="liquid" x="-20%" y="-60%" width="140%" height="220%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="2" seed="8" result="noise"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
    <feDisplacementMap in="red" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="r"/>
    <feDisplacementMap in="green" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="g"/>
    <feDisplacementMap in="blue" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="b"/>
    <feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/>
  </filter></defs>`;
  stage.append(svg);

  const displacements = [...svg.querySelectorAll('feDisplacementMap')];
  const arcLayers = [...section.querySelectorAll('.closing-rim, .closing-rim-band, .closing-rim-spec, .closing-veil')];
  const reveals = [
    section.querySelector('.eyebrow'),
    section.querySelector('.closing-statement'),
    section.querySelector('.closing-actions'),
    section.querySelector('footer')
  ].filter(Boolean);

  let geometry, p = 0, visible = false, lastDark = null;

  function measure() {
    const sr = stage.getBoundingClientRect();
    const tr = title.getBoundingClientRect();
    const h = innerHeight;
    const sectionTop = section.getBoundingClientRect().top + scrollY;
    geometry = {
      top: sectionTop,
      height: section.offsetHeight,
      travel: Math.max(1, section.offsetHeight - h),
      h,
      w: stage.clientWidth,
      ry: h * 3.2 * (innerWidth < 768 ? 0.24 : 0.38),
      tx: tr.left - sr.left,
      ty: tr.top - sr.top,
      th: tr.height,
      navBottom: header?.getBoundingClientRect().bottom || 72
    };
    Object.assign(lens.style, { left: `${geometry.tx}px`, top: `${geometry.ty}px`, width: `${tr.width}px` });
  }

  function render(currentScrollY) {
    const g = geometry;
    if (!g) return 0;
    // E1: No hold zone (p=0 starts with rim entering at 92svh, clears at p=0.50)
    const travelT = ramp(p, 0, 0.50);
    const rimY = g.h * (0.92 - 1.22 * travelT);
    const arcTransform = `translate3d(0, ${(rimY - g.h * 1.08).toFixed(2)}px, 0)`;
    arcLayers.forEach(el => { el.style.transform = arcTransform; });

    const headlineCenterY = g.ty + g.th / 2;
    const rawIntensity = clamp(1 - Math.abs(rimY - headlineCenterY) / 50);
    const intensity = rawIntensity * (innerWidth < 768 ? 0.6 : 1);

    const ring = (50 / g.ry) * 100;
    const ellipse = `ellipse ${g.w * 0.8}px ${g.ry}px at ${g.w / 2 - g.tx}px ${rimY - g.ry - g.ty}px`;
    const stops = `${100 - ring}%, ${100 - ring * 0.45}%, ${100 + ring * 0.45}%, ${100 + ring}%`;
    const [a, b, c, d] = stops.split(', ');

    if (intensity > 0.005) {
      lens.style.display = 'block';
      lens.style.opacity = '1';
      lens.style.maskImage = `radial-gradient(${ellipse}, transparent ${a}, black ${b}, black ${c}, transparent ${d})`;
      title.style.maskImage = `radial-gradient(${ellipse}, black ${a}, transparent ${b}, transparent ${c}, black ${d})`;
      lens.style.setProperty('filter', !fallback ? 'url(#liquid)' : 'none', 'important');
      lens.style.transformOrigin = `50% ${rimY - g.ty}px`;
      lens.style.transform = `scaleY(${(1 + 0.12 * intensity).toFixed(4)})`;
      const tierScale = adaptive && adaptive.tier === 2 ? 0.5 : 1;
      const s = 48 * intensity * tierScale;
      displacements.forEach((el, i) => el.setAttribute('scale', (s * [1, 0.7, 0.4][i]).toFixed(2)));
    } else {
      lens.style.opacity = '0';
      lens.style.display = 'none';
      title.style.maskImage = 'none';
      displacements.forEach(el => el.setAttribute('scale', '0'));
    }

    reveals.forEach((el, i) => {
      const start = 0.36 + i * 0.04;
      const value = easeOut(ramp(p, start, start + 0.08));
      el.style.opacity = String(value);
      el.style.transform = `translateY(${(12 * (1 - value)).toFixed(2)}px)`;
      el.inert = value < 0.95;
    });

    // E2: Nav follows the actual veil edge (rimY < navBottom), no flash
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

  // D3: Direct scroll position, no lerp lag!
  function onScrollFrame(y, time) {
    if (!visible || isUnpinned() || document.hidden || !geometry) return;
    p = clamp((y - geometry.top) / geometry.travel);
    const intensity = render(y);
    if (adaptive) adaptive.sample(time || performance.now(), intensity > 0);
  }

  function configure() {
    const unpinned = isUnpinned();
    section.classList.toggle('liquid-ready', !unpinned);
    measure();
    if (unpinned) {
      title.style.maskImage = 'none';
      lens.style.display = 'none';
      reveals.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; el.inert = false; });
      section.dataset.arcDark = 'true';
      header?.classList.remove('closing-nav-dark');
    } else {
      const y = window.scrollY || 0;
      p = clamp((y - geometry.top) / geometry.travel);
      render(y);
    }
  }

  window.__setClosingProgress = (val) => {
    p = clamp(val);
    render(window.scrollY || 0);
  };

  const syncActiveState = () => {
    const active = visible && !media.matches && !document.hidden;
    section.classList.toggle('is-active', active);
  };

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncActiveState();
    if (visible) {
      onScrollFrame(window.scrollY || 0, performance.now());
    } else {
      header?.classList.remove('closing-nav-dark');
    }
  });
  observer.observe(stage);

  if (window.TitanMotion) {
    window.TitanMotion.onScroll(onScrollFrame);
    window.TitanMotion.onResize(() => { measure(); onScrollFrame(window.scrollY || 0, performance.now()); });
  } else {
    addEventListener('scroll', () => onScrollFrame(window.scrollY || 0, performance.now()), { passive: true });
    addEventListener('resize', measure, { passive: true });
  }

  document.addEventListener('visibilitychange', syncActiveState);
  media.addEventListener('change', configure);

  section.querySelectorAll('[data-closing-module]').forEach(link => link.addEventListener('click', event => {
    const tab = document.getElementById(`tab-${link.dataset.closingModule}`);
    if (!tab) return;
    event.preventDefault();
    tab.click();
    document.getElementById('product').scrollIntoView({ behavior: media.matches ? 'instant' : 'smooth' });
    tab.focus({ preventScroll: true });
    history.replaceState(null, '', link.hash);
  }));

  const actions = section.querySelector('.closing-actions');
  actions?.addEventListener('pointermove', event => {
    if (media.matches || coarseMQ.matches || event.pointerType === 'touch') return;
    const r = actions.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width;
    const y = (event.clientY - r.top) / r.height;
    actions.style.setProperty('--ambient-x', `${(x - 0.5) * 24}px`);
    actions.style.setProperty('--ambient-y', `${(y - 0.5) * 24}px`);
    const button = event.target.closest('.button');
    if (button) {
      const b = button.getBoundingClientRect();
      button.style.setProperty('--pointer-x', `${event.clientX - b.left}px`);
      button.style.setProperty('--pointer-y', `${event.clientY - b.top}px`);
    }
  });
  actions?.addEventListener('pointerleave', () => {
    actions.style.setProperty('--ambient-x', '0px');
    actions.style.setProperty('--ambient-y', '0px');
  });

  configure();
})();
