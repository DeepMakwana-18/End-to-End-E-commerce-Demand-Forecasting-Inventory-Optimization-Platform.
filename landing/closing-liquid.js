(() => {
  'use strict';
  const section = document.querySelector('#closing');
  if (!section) return;
  const stage = section.querySelector('.closing-stage');
  const title = section.querySelector('h2');
  const header = document.querySelector('[data-header]');
  const backdrop = document.querySelector('.nav-scroll-backdrop');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const coarseMQ = matchMedia('(pointer: coarse)');
  const isUnpinnedMobile = () => innerWidth < 480 || media.matches;
  const adaptive = window.TitanMotion
    ? window.TitanMotion.createAdaptiveMonitor(tier => {
        if (tier >= 2) section.dataset.liquidTier = String(tier);
        if (tier === 3) { fallback = true; lens.classList.add('chromatic'); }
      })
    : null;
  section.dataset.liquidTier = '1';
  // Capture before adding the tall sticky section; keep one stable scroll origin.
  let sectionTop = section.getBoundingClientRect().top + scrollY;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ramp = (p, start, end) => clamp((p - start) / (end - start));
  // Cubic-bezier(.22,1,.36,1), evaluated from progress, never wall-clock time.
  const ease = x => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 12; i++) {
      const t = (lo + hi) / 2;
      const bx = 3 * (1-t)**2 * t * .22 + 3 * (1-t) * t*t * .36 + t**3;
      if (bx < x) lo = t; else hi = t;
    }
    return 1 - (1 - (lo + hi) / 2)**3;
  };
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
  const lines = [...title.querySelectorAll('.closing-line > span')];
  const lensLines = [...lens.querySelectorAll('.closing-line > span')];
  const reveals = [section.querySelector('.eyebrow'), section.querySelector('.closing-statement'), section.querySelector('.closing-actions'), section.querySelector('footer')];
  let geometry, p = 0, visible = false, frame = 0, lastTime = 0, lastFrameTime = 0, slowFrames = 0, fallback = false;

  function measure() {
    const sr = stage.getBoundingClientRect(), tr = title.getBoundingClientRect();
    const h = innerHeight;
    geometry = { top: sectionTop, travel: section.offsetHeight - h,
      h, w: stage.clientWidth, ry: h * 3.2 * (innerWidth < 768 ? .24 : .38),
      tx: tr.left - sr.left, ty: tr.top - sr.top, th: tr.height,
      navBottom: header?.getBoundingClientRect().bottom || 80 };
    Object.assign(lens.style, { left: `${geometry.tx}px`, top: `${geometry.ty}px`, width: `${tr.width}px` });
    wake();
  }
  function render() {
    const g = geometry;
    // Bring the light edge into view immediately, then clear the CTA sooner.
    const rim = g.h * (.82 - 1.12 * ramp(p, 0, .42));
    // The veil and rim are siblings of the stage, so their shared transform
    // variable must live on the section rather than the stage.
    section.style.setProperty('--arc-y', `${rim - g.h * 1.08}px`);
    const intensity = clamp(1 - Math.abs(rim - (g.ty + g.th / 2)) / 50) * (innerWidth < 768 ? .6 : 1);
    const ring = 50 / g.ry * 100;
    const ellipse = `ellipse ${g.w * .8}px ${g.ry}px at ${g.w / 2 - g.tx}px ${rim - g.ry - g.ty}px`;
    const stops = `${100-ring}%, ${100-ring*.45}%, ${100+ring*.45}%, ${100+ring}%`;
    const [a,b,c,d] = stops.split(', ');
    lens.style.maskImage = `radial-gradient(${ellipse}, transparent ${a}, black ${b}, black ${c}, transparent ${d})`;
    title.style.maskImage = intensity > 0 ? `radial-gradient(${ellipse}, black ${a}, transparent ${b}, transparent ${c}, black ${d})` : 'none';
    lens.style.opacity = intensity > 0 ? '1' : '0';
    lens.style.setProperty('filter', intensity > 0 && !fallback ? 'url(#liquid)' : 'none', 'important');
    lens.style.transformOrigin = `50% ${rim - g.ty}px`;
    lens.style.transform = `scaleY(${1 + .12 * intensity})`;
    const tierScale = adaptive && adaptive.tier === 2 ? 0.5 : 1;
    displacements.forEach((el, i) => el.setAttribute('scale', String(48 * intensity * tierScale * [1,.7,.4][i])));
    // Keep the two renderings coincident while each line clears its clipping box.
    const start = Math.max(.1, (1.08 - (g.ty + g.th) / g.h) / 1.38 * .55 - .06);
    lines.forEach((line, i) => {
      const y = (1 - ease(ramp(p, start + i * .012, start + .09 + i * .012))) * 100;
      line.style.transform = lensLines[i].style.transform = `translateY(${y}%)`;
    });
    reveals.forEach((el, i) => {
      const value = ease(ramp(p, .29 + i * .035, .37 + i * .035));
      el.style.opacity = value;
      el.style.transform = `translateY(${12 * (1-value)}px)`;
      el.inert = value < .95;
    });
    const dark = rim < g.navBottom;
    section.dataset.arcDark = String(dark);
    if (scrollY >= g.top - g.navBottom && scrollY <= g.top + section.offsetHeight) {
      header?.classList.toggle('on-dark', dark);
      header?.classList.toggle('closing-nav-dark', dark);
      backdrop?.classList.toggle('is-dark', dark);
    } else header?.classList.remove('closing-nav-dark');
    section.dataset.progress = p.toFixed(4);
    return intensity;
  }
  function tick(time) {
    frame = 0;
    if (!visible || media.matches || document.hidden) return;
    const target = clamp((scrollY - geometry.top) / Math.max(1, geometry.travel));
    // Keep the liquid feel, but make the rim track wheel/touch input promptly.
    // A 48ms time constant behaves consistently across 60/120Hz displays.
    const dt = lastFrameTime ? Math.min(64, time - lastFrameTime) : 16.7;
    p += (target - p) * (1 - Math.exp(-dt / 48));
    lastFrameTime = time;
    if (Math.abs(target - p) < .0001) p = target;
    const intensity = render();
    if (adaptive) {
      adaptive.sample(time, intensity > 0);
    } else {
      if (lastTime && intensity > 0 && time-lastTime > 20 && time-lastTime < 200) slowFrames++;
      else if (intensity > 0) slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames >= 30 && !fallback) { fallback = true; lens.classList.add('chromatic'); }
    }
    lastTime = time;
    if (p !== target) frame = requestAnimationFrame(tick);
    else { lastTime = 0; lastFrameTime = 0; }
  }
  function wake() { if (visible && !isUnpinnedMobile() && !frame) frame = requestAnimationFrame(tick); }
  function configure() {
    cancelAnimationFrame(frame); frame = 0; lastFrameTime = 0;
    const unpinned = isUnpinnedMobile();
    section.classList.toggle('liquid-ready', !unpinned);
    sectionTop = section.getBoundingClientRect().top + scrollY;
    if (unpinned) {
      title.style.maskImage = 'none';
      lines.forEach(line => line.style.transform = 'none');
      reveals.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; el.inert = false; });
      section.dataset.arcDark = 'true';
      header?.classList.remove('closing-nav-dark');
    }
    measure();
    p = clamp((scrollY - geometry.top) / Math.max(1, geometry.travel));
    if (!unpinned) render();
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    section.classList.toggle('is-active', visible && !media.matches);
    if (visible) { measure(); wake(); }
    else { cancelAnimationFrame(frame); frame = 0; lastTime = 0; header?.classList.remove('closing-nav-dark'); }
  });
  observer.observe(stage);
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => {
    sectionTop = section.getBoundingClientRect().top + scrollY;
    measure();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { lastTime = 0; wake(); });
  media.addEventListener('change', configure);
  // Layout above the CTA can change when fonts, images or FAQ answers load.
  new ResizeObserver(measure).observe(document.querySelector('main'));
  section.querySelectorAll('[data-closing-module]').forEach(link => link.addEventListener('click', event => {
    const tab = document.getElementById(`tab-${link.dataset.closingModule}`);
    if (!tab) return;
    event.preventDefault(); tab.click();
    document.getElementById('product').scrollIntoView({ behavior: media.matches ? 'instant' : 'smooth' });
    tab.focus({ preventScroll: true });
    history.replaceState(null, '', link.hash);
  }));
  const actions = section.querySelector('.closing-actions');
  actions.addEventListener('pointermove', event => {
    if (media.matches || coarseMQ.matches || event.pointerType === 'touch') return;
    const r = actions.getBoundingClientRect(), x = (event.clientX-r.left)/r.width, y = (event.clientY-r.top)/r.height;
    actions.style.setProperty('--ambient-x', `${(x-.5)*24}px`);
    actions.style.setProperty('--ambient-y', `${(y-.5)*24}px`);
    const button = event.target.closest('.button');
    if (button) { const b = button.getBoundingClientRect(); button.style.setProperty('--pointer-x', `${event.clientX-b.left}px`); button.style.setProperty('--pointer-y', `${event.clientY-b.top}px`); }
  });
  actions.addEventListener('pointerleave', () => { actions.style.setProperty('--ambient-x','0px'); actions.style.setProperty('--ambient-y','0px'); });
  configure();
})();
