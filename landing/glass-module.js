/* ==========================================================================
   GLASS MODULE — Rim v2 (Edge + 90px Dark Glow + 24px Lip) & Lens v2
   ========================================================================== */
(() => {
  'use strict';

  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Session-wide quality tier (1 -> 2 -> 3, never upgrades back)
  let sessionTier = 1;
  const tierListeners = new Set();

  function createQualityMonitor() {
    let frameCount = 0;
    let slowFrames = 0;
    let lastTime = 0;

    return {
      get tier() { return sessionTier; },
      reset() { lastTime = 0; },
      sample(now, isActive) {
        if (!isActive || sessionTier === 3) {
          lastTime = 0;
          return sessionTier;
        }
        if (lastTime > 0) {
          const dt = now - lastTime;
          if (dt > 20 && dt < 250) slowFrames++;
          frameCount++;
          if (frameCount >= 30) {
            let next = sessionTier;
            if (slowFrames >= 12 && sessionTier < 3) next = 3;
            else if (slowFrames >= 5 && sessionTier < 2) next = 2;
            if (next !== sessionTier) {
              sessionTier = next;
              document.documentElement.dataset.glassTier = String(sessionTier);
              tierListeners.forEach(fn => { try { fn(sessionTier); } catch (_) {} });
            }
            frameCount = 0;
            slowFrames = 0;
          }
        }
        lastTime = now;
        return sessionTier;
      }
    };
  }

  // Critically damped spring (response <= 120ms)
  function createSpring(initial = 0, responseMs = 110) {
    let value = initial;
    let velocity = 0;
    const omega = 2 / Math.max(0.02, responseMs / 1000);

    return {
      get value() { return value; },
      snap(v) { value = v; velocity = 0; return value; },
      step(target, dtSec) {
        const dt = Math.min(0.05, Math.max(0.001, dtSec));
        const diff = value - target;
        const exp = Math.exp(-omega * dt);
        const next = target + (diff + (velocity + omega * diff) * dt) * exp;
        velocity = (velocity - omega * (velocity + omega * diff) * dt) * exp;
        value = Math.abs(next - target) < 0.0005 && Math.abs(velocity) < 0.001 ? target : next;
        return value;
      }
    };
  }

  // Rim v2:
  // (a) 2px edge line (#f9a8d4 -> #e9d5ff -> #93c5fd) + 1px inner white highlight (80%) + moving 240px hot spot
  // (b) 90px smooth glow on DARK side (#ec4899 -> #8b5cf6 -> #3b82f6, 55% at edge -> 0% at 90px, clipped to dark side)
  // (c) 24px glass lip on VEIL side (#ec4899 -> #3b82f6 at 16%, clipped to veil side)
  let rimCounter = 0;
  function createRimSvg() {
    const id = ++rimCounter;
    const edgeGradId = `glass-edge-grad-${id}`;
    const glowGradId = `glass-glow-grad-${id}`;
    const specGradId = `glass-spec-grad-${id}`;
    const darkClipId = `glass-dark-clip-${id}`;
    const veilClipId = `glass-veil-clip-${id}`;

    // Exact elliptical arc matching CSS border-radius: 0 0 50% 50% / 0 0 38% 38% (or 24% mobile)
    // viewBox height = 1000 (arc ry = 900, bottom glow margin = 100)
    const rx = 800;
    const ry = 900;
    const d = `M 0,0 A ${rx},${ry} 0 0 0 1600,0`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'glass-rim-svg');
    svg.setAttribute('viewBox', '0 0 1600 1000');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    svg.innerHTML = `
      <defs>
        <linearGradient id="${edgeGradId}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f9a8d4" />
          <stop offset="50%" stop-color="#e9d5ff" />
          <stop offset="100%" stop-color="#93c5fd" />
        </linearGradient>
        <linearGradient id="${glowGradId}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ec4899" />
          <stop offset="50%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
        <linearGradient id="${specGradId}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.65)" />
          <stop class="spec-stop-l" offset="2%" stop-color="rgba(255,255,255,0.8)" />
          <stop class="spec-stop-c" offset="10%" stop-color="rgba(255,255,255,1)" />
          <stop class="spec-stop-r" offset="18%" stop-color="rgba(255,255,255,0.8)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.65)" />
        </linearGradient>
        <clipPath id="${darkClipId}">
          <path d="${d} L 1600,1000 L 0,1000 Z" />
        </clipPath>
        <clipPath id="${veilClipId}">
          <path d="M 0,0 L 1600,0 A ${rx},${ry} 0 0 1 0,0 Z" />
        </clipPath>
      </defs>
      <g class="glass-rim-glow" clip-path="url(#${darkClipId})">
        <path d="${d}" fill="none" stroke="url(#${glowGradId})" stroke-width="86" stroke-opacity="0.09" vector-effect="non-scaling-stroke" />
        <path d="${d}" fill="none" stroke="url(#${glowGradId})" stroke-width="52" stroke-opacity="0.18" vector-effect="non-scaling-stroke" />
        <path d="${d}" fill="none" stroke="url(#${glowGradId})" stroke-width="22" stroke-opacity="0.28" vector-effect="non-scaling-stroke" />
      </g>
      <g clip-path="url(#${veilClipId})">
        <path class="glass-rim-lip" d="${d}" fill="none" stroke="url(#${glowGradId})" stroke-width="48" vector-effect="non-scaling-stroke" />
      </g>
      <path class="glass-rim-edge" d="${d}" fill="none" stroke="url(#${edgeGradId})" stroke-width="2" vector-effect="non-scaling-stroke" />
      <path class="glass-rim-spec" d="M 0,-1.5 A ${rx},${ry} 0 0 0 1600,-1.5" fill="none" stroke="url(#${specGradId})" stroke-width="1" vector-effect="non-scaling-stroke" />
    `;

    const stopL = svg.querySelector('.spec-stop-l');
    const stopC = svg.querySelector('.spec-stop-c');
    const stopR = svg.querySelector('.spec-stop-r');

    function setSpot(progress) {
      const p = clamp(progress);
      const center = 8 + p * 84;
      const half = 5.5;
      stopL.setAttribute('offset', `${Math.max(0, center - half).toFixed(2)}%`);
      stopC.setAttribute('offset', `${center.toFixed(2)}%`);
      stopR.setAttribute('offset', `${Math.min(100, center + half).toFixed(2)}%`);
    }

    return { svg, setSpot };
  }

  // Lens v2: pixel-identical complementary masks, center-origin scale(1 + 0.04 * intensity), velocity-gated
  let lensCounter = 0;
  function createLens({ targetEl, containerEl, mode = 'screen', extraClass = '' }) {
    if (!targetEl || !containerEl) return null;
    const id = ++lensCounter;
    const filterId = `glass-liquid-filter-${id}`;
    const blendMode = mode === 'multiply' ? 'multiply' : 'screen';

    const lensEl = document.createElement(targetEl.tagName.toLowerCase());
    lensEl.className = `${targetEl.className} lens glass-lens-copy ${extraClass}`.trim();
    lensEl.setAttribute('aria-hidden', 'true');
    lensEl.removeAttribute('id');
    lensEl.innerHTML = targetEl.innerHTML;
    containerEl.appendChild(lensEl);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    svg.innerHTML = `<defs><filter id="${filterId}" x="-20%" y="-60%" width="140%" height="220%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="2" seed="8" result="noise"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
      <feDisplacementMap in="red" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="r"/>
      <feDisplacementMap in="green" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="g"/>
      <feDisplacementMap in="blue" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="b"/>
      <feBlend in="r" in2="g" mode="${blendMode}" result="rg"/>
      <feBlend in="rg" in2="b" mode="${blendMode}"/>
    </filter></defs>`;
    containerEl.appendChild(svg);

    const displacements = [...svg.querySelectorAll('feDisplacementMap')];
    let geom = null;

    function measure() {
      const cr = containerEl.getBoundingClientRect();
      const tr = targetEl.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;
      geom = {
        w: cr.width || vw,
        ry: vh * 3.2 * (isMobile ? 0.24 : 0.38),
        tx: tr.left - cr.left,
        ty: tr.top - cr.top,
        tw: tr.width,
        th: tr.height,
        textCenterY: (tr.top - cr.top) + tr.height / 2,
        isMobile
      };
      Object.assign(lensEl.style, {
        left: `${geom.tx}px`,
        top: `${geom.ty}px`,
        width: `${geom.tw}px`,
        height: `${geom.th}px`
      });
    }

    function update(rimYInContainer, velocityFactor = 1) {
      if (!geom) measure();
      if (reducedMQ.matches || sessionTier === 3) {
        lensEl.style.visibility = 'hidden';
        lensEl.style.display = 'none';
        targetEl.style.maskImage = 'none';
        targetEl.style.webkitMaskImage = 'none';
        return 0;
      }

      const d = clamp(Math.abs(rimYInContainer - geom.textCenterY) / 70, 0, 1);
      const proximity = Math.pow(1 - d, 2);
      const vel = clamp(velocityFactor, 0, 1);
      const intensity = proximity * vel * (geom.isMobile ? 0.6 : 1);

      if (intensity <= 0.005) {
        lensEl.style.visibility = 'hidden';
        lensEl.style.display = 'none';
        targetEl.style.maskImage = 'none';
        targetEl.style.webkitMaskImage = 'none';
        displacements.forEach(el => el.setAttribute('scale', '0'));
        return 0;
      }

      // Complementary masks from the same gradient function (alpha_lens + alpha_clean = 1)
      const ringHalf = (70 / geom.ry) * 100;
      const ellipse = `ellipse ${geom.w * 0.8}px ${geom.ry}px at ${geom.w / 2 - geom.tx}px ${rimYInContainer - geom.ry - geom.ty}px`;
      const a = `${(100 - ringHalf).toFixed(2)}%`;
      const b = `${(100 - ringHalf * 0.45).toFixed(2)}%`;
      const c = `${(100 + ringHalf * 0.45).toFixed(2)}%`;
      const dStop = `${(100 + ringHalf).toFixed(2)}%`;

      const lensMask = `radial-gradient(${ellipse}, rgba(0,0,0,0) ${a}, rgba(0,0,0,1) ${b}, rgba(0,0,0,1) ${c}, rgba(0,0,0,0) ${dStop})`;
      const cleanMask = `radial-gradient(${ellipse}, rgba(0,0,0,1) ${a}, rgba(0,0,0,0) ${b}, rgba(0,0,0,0) ${c}, rgba(0,0,0,1) ${dStop})`;

      lensEl.style.display = 'block';
      lensEl.style.visibility = 'visible';
      lensEl.style.maskImage = lensMask;
      lensEl.style.webkitMaskImage = lensMask;
      targetEl.style.maskImage = cleanMask;
      targetEl.style.webkitMaskImage = cleanMask;

      lensEl.style.filter = `url(#${filterId})`;
      lensEl.style.transformOrigin = 'center center';
      lensEl.style.transform = `scale(${(1 + 0.04 * intensity).toFixed(4)})`;

      const tierScale = sessionTier === 2 ? 0.5 : 1;
      const s = 40 * intensity * tierScale;
      displacements[0]?.setAttribute('scale', s.toFixed(2));
      displacements[1]?.setAttribute('scale', (s * 0.7).toFixed(2));
      displacements[2]?.setAttribute('scale', (s * 0.4).toFixed(2));
      return intensity;
    }

    function destroy() {
      targetEl.style.maskImage = 'none';
      targetEl.style.webkitMaskImage = 'none';
      lensEl.remove();
      svg.remove();
    }

    return { lensEl, measure, update, destroy };
  }

  window.TitanGlass = {
    createQualityMonitor,
    createSpring,
    createRimSvg,
    createLens,
    get tier() { return sessionTier; },
    onTierChange(fn) { tierListeners.add(fn); return () => tierListeners.delete(fn); }
  };
})();
