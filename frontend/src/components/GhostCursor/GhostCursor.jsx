import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import './GhostCursor.css';

const GOLD_PRIMARY = '#D4AF37';
const GOLD_RICH = '#C9A227';
const GOLD_CHAMPAGNE = '#E6D08D';
const GOLD_HIGHLIGHT = '#FFF9E6';

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="button"], .btn-primary, .btn-secondary, .btn-danger, .btn-icon';

const GhostCursor = ({
  className,
  style,
  trailLength = 18,
  inertia = 0.85,
  smoothness = 0.18,
  brightness = 1.35,
  color = GOLD_PRIMARY,
  colorRich = GOLD_RICH,
  colorChampagne = GOLD_CHAMPAGNE,
  colorHighlight = GOLD_HIGHLIGHT,
  mixBlendMode = 'multiply',
  edgeIntensity = 0,
  maxDevicePixelRatio = 0.75,
  targetPixels,
  fadeDelayMs,
  fadeDurationMs,
  magneticStrength = 0.10,
  hoverExpand = 1.35,
  rippleDurationMs = 520,
  zIndex = 5
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const materialRef = useRef(null);

  const trailBufRef = useRef([]);
  const headRef = useRef(0);

  const rafRef = useRef(null);
  const resizeObsRef = useRef(null);
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const smoothMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const velocityRef = useRef(new THREE.Vector2(0, 0));
  const fadeOpacityRef = useRef(1.0);
  const hoverStrengthRef = useRef(0);
  const rippleProgressRef = useRef(0);
  const ripplePosRef = useRef(new THREE.Vector2(0.5, 0.5));
  const rippleStartRef = useRef(0);
  const lastMoveTimeRef = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const pointerActiveRef = useRef(false);
  const runningRef = useRef(false);
  const hasValidSizeRef = useRef(false);

  const isTouch = useMemo(
    () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    []
  );

  const supportsFinePointer = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    []
  );

  const pixelBudget = targetPixels ?? (isTouch ? 0.8e6 : 1.1e6);
  const fadeDelay = fadeDelayMs ?? (isTouch ? 400 : 800);
  const fadeDuration = fadeDurationMs ?? (isTouch ? 900 : 1200);

  const baseVertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  /* Premium gold glass orb — no FBM smoke, GPU-friendly gaussian falloffs */
  const fragmentShader = `
    uniform float iTime;
    uniform vec3  iResolution;
    uniform vec2  iMouse;
    uniform vec2  iPrevMouse[MAX_TRAIL_LENGTH];
    uniform float iOpacity;
    uniform float iScale;
    uniform vec3  iGoldPrimary;
    uniform vec3  iGoldRich;
    uniform vec3  iGoldChampagne;
    uniform vec3  iGoldHighlight;
    uniform float iBrightness;
    uniform float iEdgeIntensity;
    uniform float iHoverStrength;
    uniform vec2  iRipplePos;
    uniform float iRippleProgress;
    varying vec2  vUv;

    vec2 aspectUV(vec2 uv) {
      return uv * vec2(iResolution.x / iResolution.y, 1.0);
    }

    vec4 glassOrb(vec2 p, vec2 center, float radius, float intensity, float isHead) {
      float d = length(p - center);
      float r = radius * (1.0 + iHoverStrength * 0.18 * isHead);

      float core   = exp(-(d * d) / (r * r * 0.09));
      float glow   = exp(-(d * d) / (r * r * 0.85)) * 0.52;
      float aura   = exp(-(d * d) / (r * r * 1.45)) * 0.28;
      float frost  = exp(-(d * d) / (r * r * 0.22)) * 0.62;
      float ring   = smoothstep(r * 1.08, r * 0.90, d) * smoothstep(r * 0.68, r * 0.86, d);

      vec3 glassBody = mix(iGoldRich, iGoldChampagne, frost);
      glassBody = mix(glassBody, iGoldPrimary, core * 0.55);
      glassBody = mix(glassBody, iGoldHighlight, core * core * 0.18);

      float spec = ring * (0.22 + 0.12 * sin(iTime * 1.1 + d * 10.0));
      float shimmer = exp(-(d * d) / (r * r * 0.38)) * 0.07 * (0.5 + 0.5 * sin(iTime * 0.85 + d * 16.0));
      glassBody += (spec + shimmer) * iGoldHighlight;

      float alpha = (core * 0.22 + glow * 0.18 + aura * 0.12 + frost * 0.08) * intensity;
      alpha = clamp(alpha, 0.0, 0.40);

      return vec4(glassBody * alpha, alpha);
    }

    float clickRipple(vec2 p, vec2 origin, float progress) {
      if (progress <= 0.0 || progress >= 1.0) return 0.0;
      float d = length(p - origin);
      float wave = progress * 0.14;
      float ring = smoothstep(wave + 0.018, wave, abs(d - wave));
      float fade = (1.0 - progress) * (1.0 - progress);
      return ring * fade * 0.14;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy / iResolution.xy * 2.0 - 1.0);
      vec2 p  = aspectUV(uv);
      vec2 mouse = aspectUV((iMouse * 2.0 - 1.0));

      float baseRadius = (0.034 + 0.008 / iScale) * (1.0 + iHoverStrength * 0.28);

      vec3 colorAcc = vec3(0.0);
      float alphaAcc = 0.0;

      vec4 head = glassOrb(p, mouse, baseRadius, 1.0, 1.0);
      colorAcc += head.rgb;
      alphaAcc += head.a;

      for (int i = 0; i < MAX_TRAIL_LENGTH; i++) {
        vec2 pm = aspectUV((iPrevMouse[i] * 2.0 - 1.0));
        float t = 1.0 - float(i) / float(MAX_TRAIL_LENGTH);
        t = t * t * t;
        if (t > 0.015) {
          vec4 tr = glassOrb(p, pm, baseRadius * (0.55 + t * 0.35), t * 0.72, 0.0);
          colorAcc += tr.rgb;
          alphaAcc += tr.a * 0.85;
        }
      }

      float ripple = clickRipple(p, aspectUV((iRipplePos * 2.0 - 1.0)), iRippleProgress);
      colorAcc += iGoldChampagne * ripple;
      alphaAcc += ripple;

      colorAcc *= iBrightness;

      vec2 uv01 = gl_FragCoord.xy / iResolution.xy;
      float edgeDist = min(min(uv01.x, 1.0 - uv01.x), min(uv01.y, 1.0 - uv01.y));
      float distFromEdge = clamp(edgeDist * 2.0, 0.0, 1.0);
      float k = clamp(iEdgeIntensity, 0.0, 1.0);
      float edgeMask = mix(1.0 - k, 1.0, distFromEdge);

      float outAlpha = clamp(alphaAcc * iOpacity * edgeMask, 0.0, 0.45);
      gl_FragColor = vec4(colorAcc, outAlpha);
    }
  `;

  function calculateScale(el) {
    const r = el.getBoundingClientRect();
    const base = 600;
    const current = Math.min(Math.max(1, r.width), Math.max(1, r.height));
    return Math.max(0.5, Math.min(2.0, current / base));
  }

  function toNormalized(e, parent) {
    const rect = parent.getBoundingClientRect();
    const x = THREE.MathUtils.clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const y = THREE.MathUtils.clamp(1 - (e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    return { x, y, rect };
  }

  function applyMagneticPull(x, y, parentRect, e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const interactive = el?.closest?.(INTERACTIVE_SELECTOR);
    if (!interactive) {
      hoverStrengthRef.current = THREE.MathUtils.lerp(hoverStrengthRef.current, 0, 0.12);
      return { x, y };
    }

    const ir = interactive.getBoundingClientRect();
    const cx = THREE.MathUtils.clamp((ir.left + ir.width * 0.5 - parentRect.left) / Math.max(1, parentRect.width), 0, 1);
    const cy = THREE.MathUtils.clamp(1 - (ir.top + ir.height * 0.5 - parentRect.top) / Math.max(1, parentRect.height), 0, 1);

    const dx = cx - x;
    const dy = cy - y;
    const dist = Math.hypot(dx, dy);
    const pull = magneticStrength * Math.exp(-dist * 4.5);

    hoverStrengthRef.current = THREE.MathUtils.lerp(hoverStrengthRef.current, hoverExpand - 1, 0.14);

    return {
      x: THREE.MathUtils.clamp(x + dx * pull, 0, 1),
      y: THREE.MathUtils.clamp(y + dy * pull, 0, 1)
    };
  }

  useEffect(() => {
    const host = containerRef.current;
    const parent = host?.parentElement;
    if (!host || !parent || !supportsFinePointer) return;

    let active = true;

    const prevParentPos = parent.style.position;
    if (!prevParentPos || prevParentPos === 'static') {
      parent.style.position = 'relative';
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      depth: false,
      stencil: false,
      powerPreference: isTouch ? 'low-power' : 'high-performance',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false
    });
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    renderer.domElement.style.pointerEvents = 'none';
    if (mixBlendMode) {
      renderer.domElement.style.mixBlendMode = String(mixBlendMode);
    }

    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geom = new THREE.PlaneGeometry(2, 2);

    const maxTrail = Math.max(1, Math.floor(trailLength));
    trailBufRef.current = Array.from({ length: maxTrail }, () => new THREE.Vector2(0.5, 0.5));
    headRef.current = 0;

    const cPrimary = new THREE.Color(color);
    const cRich = new THREE.Color(colorRich);
    const cChampagne = new THREE.Color(colorChampagne);
    const cHighlight = new THREE.Color(colorHighlight);

    const material = new THREE.ShaderMaterial({
      defines: { MAX_TRAIL_LENGTH: maxTrail },
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(1, 1, 1) },
        iMouse: { value: smoothMouseRef.current.clone() },
        iPrevMouse: { value: trailBufRef.current.map(v => v.clone()) },
        iOpacity: { value: 1.0 },
        iScale: { value: 1.0 },
        iGoldPrimary: { value: new THREE.Vector3(cPrimary.r, cPrimary.g, cPrimary.b) },
        iGoldRich: { value: new THREE.Vector3(cRich.r, cRich.g, cRich.b) },
        iGoldChampagne: { value: new THREE.Vector3(cChampagne.r, cChampagne.g, cChampagne.b) },
        iGoldHighlight: { value: new THREE.Vector3(cHighlight.r, cHighlight.g, cHighlight.b) },
        iBrightness: { value: brightness },
        iEdgeIntensity: { value: edgeIntensity },
        iHoverStrength: { value: 0 },
        iRipplePos: { value: ripplePosRef.current.clone() },
        iRippleProgress: { value: 0 }
      },
      vertexShader: baseVertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    materialRef.current = material;

    scene.add(new THREE.Mesh(geom, material));

    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    composer.addPass(new RenderPass(scene, camera));

    const resize = () => {
      if (!active) return;

      const rect = host.getBoundingClientRect();
      const cssW = Math.floor(rect.width);
      const cssH = Math.floor(rect.height);

      if (cssW <= 0 || cssH <= 0) {
        hasValidSizeRef.current = false;
        return;
      }

      const currentDPR = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio);
      const need = cssW * cssH * currentDPR * currentDPR;
      const scale = need <= pixelBudget ? 1 : Math.max(0.5, Math.min(1, Math.sqrt(pixelBudget / Math.max(1, need))));
      const pixelRatio = currentDPR * scale;

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(cssW, cssH, false);
      composer.setPixelRatio?.(pixelRatio);
      composer.setSize(cssW, cssH);

      const wpx = Math.max(1, Math.floor(cssW * pixelRatio));
      const hpx = Math.max(1, Math.floor(cssH * pixelRatio));
      material.uniforms.iResolution.value.set(wpx, hpx, 1);
      material.uniforms.iScale.value = calculateScale(host);

      hasValidSizeRef.current = true;
    };

    resize();
    const ro = new ResizeObserver(() => active && resize());
    resizeObsRef.current = ro;
    ro.observe(parent);
    ro.observe(host);

    const start = performance.now();

    const animate = () => {
      if (!active) return;

      if (!hasValidSizeRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = performance.now();
      const t = (now - start) / 1000;
      const mat = materialRef.current;

      const ease = pointerActiveRef.current ? smoothness : smoothness * 0.55;
      smoothMouseRef.current.lerp(targetMouseRef.current, ease);
      mat.uniforms.iMouse.value.copy(smoothMouseRef.current);

      if (!pointerActiveRef.current) {
        velocityRef.current.multiplyScalar(inertia);
        if (velocityRef.current.lengthSq() > 1e-7) {
          targetMouseRef.current.add(velocityRef.current);
          targetMouseRef.current.x = THREE.MathUtils.clamp(targetMouseRef.current.x, 0, 1);
          targetMouseRef.current.y = THREE.MathUtils.clamp(targetMouseRef.current.y, 0, 1);
        }
        const dt = now - lastMoveTimeRef.current;
        if (dt > fadeDelay) {
          const k = Math.min(1, (dt - fadeDelay) / fadeDuration);
          fadeOpacityRef.current = Math.max(0, 1 - k);
        }
      } else {
        fadeOpacityRef.current = 1.0;
      }

      const N = trailBufRef.current.length;
      headRef.current = (headRef.current + 1) % N;
      trailBufRef.current[headRef.current].copy(smoothMouseRef.current);
      const arr = mat.uniforms.iPrevMouse.value;
      for (let i = 0; i < N; i++) {
        arr[i].copy(trailBufRef.current[(headRef.current - i + N) % N]);
      }

      if (rippleStartRef.current > 0) {
        const elapsed = now - rippleStartRef.current;
        rippleProgressRef.current = Math.min(1, elapsed / rippleDurationMs);
        if (rippleProgressRef.current >= 1) {
          rippleStartRef.current = 0;
          rippleProgressRef.current = 0;
        }
      }

      mat.uniforms.iOpacity.value = fadeOpacityRef.current;
      mat.uniforms.iTime.value = t;
      mat.uniforms.iHoverStrength.value = hoverStrengthRef.current;
      mat.uniforms.iRipplePos.value.copy(ripplePosRef.current);
      mat.uniforms.iRippleProgress.value = rippleProgressRef.current;

      composerRef.current.render();

      if (!pointerActiveRef.current && fadeOpacityRef.current <= 0.001) {
        runningRef.current = false;
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    const ensureLoop = () => {
      if (!runningRef.current) {
        runningRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const onPointerMove = e => {
      const { x, y, rect } = toNormalized(e, parent);
      const pulled = applyMagneticPull(x, y, rect, e);

      velocityRef.current.set(
        pulled.x - targetMouseRef.current.x,
        pulled.y - targetMouseRef.current.y
      );
      targetMouseRef.current.set(pulled.x, pulled.y);
      pointerActiveRef.current = true;
      lastMoveTimeRef.current = performance.now();
      ensureLoop();
    };

    const onPointerDown = e => {
      const { x, y } = toNormalized(e, parent);
      ripplePosRef.current.set(x, y);
      rippleStartRef.current = performance.now();
      rippleProgressRef.current = 0.001;
      ensureLoop();
    };

    const onPointerEnter = () => {
      pointerActiveRef.current = true;
      ensureLoop();
    };

    const onPointerLeave = () => {
      pointerActiveRef.current = false;
      hoverStrengthRef.current = 0;
      lastMoveTimeRef.current = performance.now();
      ensureLoop();
    };

    parent.addEventListener('pointermove', onPointerMove, { passive: true });
    parent.addEventListener('pointerdown', onPointerDown, { passive: true });
    parent.addEventListener('pointerenter', onPointerEnter, { passive: true });
    parent.addEventListener('pointerleave', onPointerLeave, { passive: true });

    ensureLoop();

    return () => {
      active = false;
      hasValidSizeRef.current = false;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;

      parent.removeEventListener('pointermove', onPointerMove);
      parent.removeEventListener('pointerdown', onPointerDown);
      parent.removeEventListener('pointerenter', onPointerEnter);
      parent.removeEventListener('pointerleave', onPointerLeave);
      resizeObsRef.current?.disconnect();

      scene.clear();
      geom.dispose();
      material.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      if (!prevParentPos || prevParentPos === 'static') {
        parent.style.position = prevParentPos;
      }
    };
  }, [
    trailLength,
    inertia,
    smoothness,
    brightness,
    color,
    colorRich,
    colorChampagne,
    colorHighlight,
    mixBlendMode,
    edgeIntensity,
    maxDevicePixelRatio,
    pixelBudget,
    fadeDelay,
    fadeDuration,
    magneticStrength,
    hoverExpand,
    rippleDurationMs,
    isTouch
  ]);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const c = new THREE.Color(color);
    mat.uniforms.iGoldPrimary.value.set(c.r, c.g, c.b);
  }, [color]);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const c = new THREE.Color(colorRich);
    mat.uniforms.iGoldRich.value.set(c.r, c.g, c.b);
  }, [colorRich]);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const c = new THREE.Color(colorChampagne);
    mat.uniforms.iGoldChampagne.value.set(c.r, c.g, c.b);
  }, [colorChampagne]);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const c = new THREE.Color(colorHighlight);
    mat.uniforms.iGoldHighlight.value.set(c.r, c.g, c.b);
  }, [colorHighlight]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.iBrightness.value = brightness;
    }
  }, [brightness]);

  useEffect(() => {
    const el = rendererRef.current?.domElement;
    if (!el) return;
    if (mixBlendMode) {
      el.style.mixBlendMode = String(mixBlendMode);
    } else {
      el.style.removeProperty('mix-blend-mode');
    }
  }, [mixBlendMode]);

  const mergedStyle = useMemo(() => ({ zIndex, ...style }), [zIndex, style]);
  const shouldRender = typeof window !== 'undefined' && supportsFinePointer;

  if (!shouldRender) {
    return null;
  }

  return <div ref={containerRef} className={`ghost-cursor ${className ?? ''}`} style={mergedStyle} aria-hidden="true" />;
};

export default GhostCursor;
