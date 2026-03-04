"use client";

import { useEffect, useRef } from "react";

const AIRPLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 30" fill="#4a5568" opacity="0.6">
  <path d="M5 15 L20 13 L35 2 L38 4 L28 13 L55 11 L70 3 L73 5 L62 14 L78 14 L78 16 L62 16 L73 25 L70 27 L55 19 L28 17 L38 26 L35 28 L20 17 L5 15Z"/>
</svg>`;

const BALLOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 60" opacity="0.6">
  <ellipse cx="20" cy="20" rx="16" ry="20" fill="#e53e3e"/>
  <ellipse cx="20" cy="20" rx="16" ry="20" fill="url(#bg)" />
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e53e3e"/>
      <stop offset="33%" stop-color="#dd6b20"/>
      <stop offset="66%" stop-color="#d69e2e"/>
      <stop offset="100%" stop-color="#e53e3e"/>
    </linearGradient>
  </defs>
  <path d="M12 38 L16 42 L24 42 L28 38" stroke="#744210" stroke-width="1" fill="none"/>
  <line x1="12" y1="38" x2="14" y2="44" stroke="#744210" stroke-width="0.8"/>
  <line x1="28" y1="38" x2="26" y2="44" stroke="#744210" stroke-width="0.8"/>
  <rect x="14" y="44" width="12" height="8" rx="1" fill="#744210"/>
</svg>`;

function injectStyles() {
  if (document.getElementById("sky-animation-styles")) return;

  const style = document.createElement("style");
  style.id = "sky-animation-styles";
  style.textContent = `
    .sky-animation-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 9998;
    }
    @keyframes sky-fly-ltr {
      from { transform: translateX(-100px); }
      to { transform: translateX(calc(100vw + 100px)); }
    }
    @keyframes sky-fly-rtl {
      from { transform: translateX(calc(100vw + 100px)) scaleX(-1); }
      to { transform: translateX(-100px) scaleX(-1); }
    }
    @keyframes sky-rise {
      from { transform: translateY(calc(100vh + 100px)); }
      to { transform: translateY(-150px); }
    }
  `;
  document.head.appendChild(style);
}

function createContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "sky-animation-container";
  document.body.appendChild(container);
  return container;
}

function spawnAnimation(container: HTMLDivElement) {
  const isBalloon = Math.random() > 0.5;
  const el = document.createElement("div");
  el.style.position = "absolute";

  if (isBalloon) {
    el.innerHTML = BALLOON_SVG;
    el.style.width = "40px";
    const x = 10 + Math.random() * 80;
    el.style.left = x + "%";
    el.style.bottom = "0";
    const duration = 20 + Math.random() * 5;
    el.style.animation = `sky-rise ${duration}s linear forwards`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000);
  } else {
    el.innerHTML = AIRPLANE_SVG;
    el.style.width = "50px";
    const y = 5 + Math.random() * 50;
    el.style.top = y + "%";
    const ltr = Math.random() > 0.5;
    el.style.left = "0";
    const duration = 15 + Math.random() * 5;
    el.style.animation = `${ltr ? "sky-fly-ltr" : "sky-fly-rtl"} ${duration}s linear forwards`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000);
  }
}

export default function SkyAnimationClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function start() {
      injectStyles();
      containerRef.current = createContainer();

      // Spawn one after a short initial delay
      timeoutRef.current = setTimeout(() => {
        if (containerRef.current) spawnAnimation(containerRef.current);
      }, 5000);

      // Then every 60-120 seconds
      intervalRef.current = setInterval(
        () => {
          if (containerRef.current) spawnAnimation(containerRef.current);
        },
        60000 + Math.random() * 60000
      );
    }

    function stop() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
    }

    function update() {
      const isDark = document.documentElement.classList.contains("dark");
      if (!isDark && !containerRef.current) {
        start();
      } else if (isDark && containerRef.current) {
        stop();
      }
    }

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  return null;
}
