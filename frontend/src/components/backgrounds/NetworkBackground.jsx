import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const themePalette = {
  'royal-gold': {
    node: 'rgba(255,255,255,0.78)',
    line: 'rgba(212,175,55,0.18)',
    glow: 'rgba(255,249,230,0.14)',
    background: 'rgba(8,6,10,0.92)',
  },
  'navy-gold': {
    node: 'rgba(30,58,95,0.74)',
    line: 'rgba(212,175,55,0.18)',
    glow: 'rgba(232,206,138,0.12)',
    background: 'rgba(5,12,26,0.92)',
  },
  'emerald-gold': {
    node: 'rgba(26,77,62,0.76)',
    line: 'rgba(212,175,55,0.18)',
    glow: 'rgba(214,194,143,0.12)',
    background: 'rgba(7,14,12,0.92)',
  },
  'burgundy-gold': {
    node: 'rgba(92,36,51,0.76)',
    line: 'rgba(212,175,55,0.18)',
    glow: 'rgba(228,198,156,0.12)',
    background: 'rgba(15,8,10,0.92)',
  },
  'sapphire-gold': {
    node: 'rgba(26,58,92,0.74)',
    line: 'rgba(212,175,55,0.18)',
    glow: 'rgba(213,184,132,0.12)',
    background: 'rgba(6,11,20,0.92)',
  },
  'pearl-gold': {
    node: 'rgba(255,253,249,0.84)',
    line: 'rgba(212,175,55,0.20)',
    glow: 'rgba(255,250,242,0.16)',
    background: 'rgba(18,18,22,0.88)',
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const NetworkBackground = () => {
  const { currentTheme } = useTheme();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const nodesRef = useRef([]);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const visibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = window.devicePixelRatio || 1;
    let rafId = null;
    let nodeCount = 0;
    let themeColors = themePalette[currentTheme.id] || themePalette['royal-gold'];
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodeCount = Math.min(isTouch ? 40 : 90, Math.max(isTouch ? 24 : 40, Math.floor((width * height) / (isTouch ? 42000 : 24000))));
      nodesRef.current = Array.from({ length: nodeCount }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = (isTouch ? 0.18 : 0.45) + Math.random() * 0.45;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.2 + Math.random() * 1.4,
          baseRadius: 1.2 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const updatePointer = (event) => {
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      pointerRef.current = {
        x: clamp(clientX / width, 0, 1),
        y: clamp(clientY / height, 0, 1),
        active: true,
      };
    };

    const clearPointer = () => {
      pointerRef.current.active = false;
    };

    const render = () => {
      if (!visibleRef.current) {
        rafId = null;
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = themeColors.background;
      ctx.fillRect(0, 0, width, height);

      const gradient = ctx.createRadialGradient(width * 0.5, height * 0.17, 0, width * 0.5, height * 0.17, width * 0.7);
      gradient.addColorStop(0, themeColors.glow);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const pointer = pointerRef.current;
      const px = pointer.x * width;
      const py = pointer.y * height;
      const influenceRadius = Math.max(width, height) * 0.24;
      const lineThreshold = Math.max(90, Math.min(140, Math.min(width, height) * 0.13));
      const parallaxX = (pointer.x - 0.5) * 22;
      const parallaxY = (pointer.y - 0.5) * 14;

      const nodes = nodesRef.current;

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        node.phase += 0.02;
        const pulse = 0.9 + Math.sin(node.phase) * 0.18;
        node.radius = node.baseRadius * pulse;

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < -50) node.x = width + 50;
        if (node.x > width + 50) node.x = -50;
        if (node.y < -50) node.y = height + 50;
        if (node.y > height + 50) node.y = -50;

        if (pointer.active) {
          const dx = px - node.x;
          const dy = py - node.y;
          const dist = Math.hypot(dx, dy);
          if (dist < influenceRadius) {
            const strength = ((influenceRadius - dist) / influenceRadius) * 0.06;
            node.vx -= dx * strength * 0.0008;
            node.vy -= dy * strength * 0.0008;
          }
        }

        node.vx *= 0.997;
        node.vy *= 0.997;
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        const ax = a.x + parallaxX * 0.12;
        const ay = a.y + parallaxY * 0.12;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const bx = b.x + parallaxX * 0.12;
          const by = b.y + parallaxY * 0.12;
          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.hypot(dx, dy);
          if (dist < lineThreshold) {
            const alpha = (1 - dist / lineThreshold) * 0.16;
            ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        const nx = node.x + parallaxX * 0.12;
        const ny = node.y + parallaxY * 0.12;
        if (node.radius > 0.3) {
          ctx.fillStyle = themeColors.glow;
          ctx.beginPath();
          ctx.arc(nx, ny, node.radius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = themeColors.node;
        ctx.beginPath();
        ctx.arc(nx, ny, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current && rafId === null) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    const handleResize = () => {
      resizeCanvas();
    };

    const start = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    resizeCanvas();
    start();

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerdown', updatePointer, { passive: true });
    window.addEventListener('pointerleave', clearPointer);
    window.addEventListener('touchmove', updatePointer, { passive: true });
    window.addEventListener('touchstart', updatePointer, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerdown', updatePointer);
      window.removeEventListener('pointerleave', clearPointer);
      window.removeEventListener('touchmove', updatePointer);
      window.removeEventListener('touchstart', updatePointer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentTheme]);

  return <canvas ref={canvasRef} className="network-background" aria-hidden="true" />;
};

export default NetworkBackground;
