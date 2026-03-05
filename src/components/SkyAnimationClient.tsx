"use client";

import { useEffect, useRef } from "react";

const AIRPLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1232 1280" fill="#3b5d7a" opacity="0.45">
<g transform="translate(0,1280) scale(0.1,-0.1)" stroke="none">
<path d="M3030 12793 c-696 -47 -1348 -259 -1611 -522 -110 -110 -126 -167 -109 -371 39 -445 279 -1452 723 -3038 l54 -192 -46 -13 c-25 -7 -200 -54 -388 -103 -260 -67 -343 -93 -343 -104 1 -8 59 -217 129 -465 l128 -450 -51 -7 c-28 -4 -98 -17 -154 -29 -57 -11 -105 -19 -107 -17 -1 2 -10 109 -19 238 -113 1556 -347 2729 -638 3197 -180 289 -428 360 -534 152 -46 -92 -58 -167 -58 -379 -1 -243 23 -446 100 -830 138 -699 463 -1755 742 -2412 l49 -117 -66 -44 c-226 -151 -360 -365 -406 -651 -19 -117 -19 -225 0 -373 82 -628 409 -1086 921 -1293 77 -30 100 -44 105 -62 4 -13 12 -84 18 -158 47 -565 263 -1450 538 -2205 335 -919 700 -1469 988 -1493 118 -10 230 65 274 182 45 120 49 247 15 466 -88 574 -565 1672 -1286 2961 l-104 185 131 12 c71 6 163 21 204 32 40 11 76 19 78 16 6 -5 17 -46 224 -776 89 -316 163 -576 164 -578 2 -2 495 165 757 256 l87 31 86 -267 c720 -2243 1202 -3308 1581 -3500 107 -54 171 -66 349 -66 172 0 260 12 459 64 581 150 1324 556 1653 904 93 98 135 165 160 257 26 95 23 390 -6 604 -90 651 -338 1605 -782 3004 -55 172 -99 315 -97 316 2 1 37 17 78 35 334 145 715 333 1137 561 870 470 1621 920 2296 1375 125 85 230 154 233 154 2 0 71 -54 152 -121 413 -339 741 -552 972 -630 124 -42 242 -46 306 -12 81 43 152 153 185 283 20 78 17 347 -5 475 -58 345 -212 807 -447 1343 -137 311 -606 1231 -807 1582 -390 682 -727 1008 -1071 1036 -254 21 -412 -114 -511 -435 -53 -173 -100 -503 -100 -702 0 -43 -5 -81 -10 -84 -6 -4 -264 -45 -573 -91 -657 -98 -1348 -201 -2100 -314 -642 -96 -672 -100 -945 -146 -117 -20 -215 -34 -217 -32 -1 1 -50 134 -108 293 -502 1384 -974 2536 -1144 2791 -91 137 -384 241 -768 274 -110 9 -355 11 -465 3z"/>
</g>
</svg>`;

const BALLOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 777 1280" fill="#3b5d7a" opacity="0.45">
<g transform="translate(0,1280) scale(0.1,-0.1)" stroke="none">
<path d="M3702 12789 c-948 -51 -1815 -451 -2497 -1150 -315 -323 -540 -640 -745 -1049 -396 -791 -547 -1757 -394 -2530 162 -817 645 -1793 1383 -2790 320 -433 652 -825 1011 -1195 102 -104 197 -204 211 -222 16 -19 38 -33 55 -35 34 -4 28 12 124 -363 134 -529 254 -1108 325 -1570 14 -93 28 -182 31 -198 l6 -27 -157 0 c-186 0 -219 -11 -256 -87 -52 -107 26 -223 151 -223 l40 0 0 -436 c0 -480 2 -499 62 -618 42 -84 154 -192 238 -233 119 -56 136 -58 605 -58 389 0 436 2 489 18 184 57 307 170 375 345 l26 67 3 456 3 457 53 4 c67 6 112 37 138 95 24 55 17 111 -19 154 -46 54 -66 59 -253 59 l-170 0 0 35 c0 53 65 557 106 817 60 385 165 915 242 1213 l18 70 46 3 c43 3 46 5 64 45 12 28 83 108 219 247 1315 1338 2264 2876 2474 4010 43 232 52 332 52 572 -1 1006 -347 1970 -985 2738 -98 118 -331 355 -451 459 -569 492 -1263 806 -1980 895 -107 14 -459 38 -489 35 -6 -1 -75 -5 -154 -10z m-345 -8983 c3 -2 243 -2112 243 -2132 0 -11 -34 -14 -189 -14 l-189 0 -17 113 c-56 373 -157 903 -245 1282 -40 175 -157 639 -185 740 -6 20 -2 20 287 17 161 -2 294 -5 295 -6z m857 -7 c3 -3 -99 -2124 -103 -2137 -1 -1 -112 -1 -248 0 l-248 3 -116 1025 c-64 564 -119 1047 -123 1074 l-5 49 419 -5 c231 -2 422 -6 424 -9z m676 -6 c0 -3 -20 -90 -45 -192 -120 -503 -229 -1130 -295 -1696 -11 -99 -23 -195 -26 -212 l-5 -33 -194 0 -195 0 0 48 c0 26 23 501 50 1057 28 555 50 1015 50 1022 0 10 71 13 330 13 182 0 330 -3 330 -7z"/>
</g>
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
    @keyframes sky-fly-diagonal-up {
      from { transform: translate(-150px, calc(100vh + 150px)) rotate(45deg); }
      to { transform: translate(calc(100vw + 150px), -150px) rotate(45deg); }
    }
    @keyframes sky-fly-diagonal-down {
      from { transform: translate(calc(100vw + 150px), -150px) rotate(135deg); }
      to { transform: translate(-150px, calc(100vh + 150px)) rotate(135deg); }
    }
    @keyframes sky-rise {
      from { transform: translateY(calc(100vh + 100px)); }
      to { transform: translateY(calc(-100vh - 100px)); }
    }
    @keyframes sparkle-rise {
      0% { transform: translateY(0) translateX(0); opacity: 0; }
      10% { opacity: var(--sparkle-peak-opacity); }
      70% { opacity: var(--sparkle-peak-opacity); }
      100% { transform: translateY(calc(-100vh - 50px)) translateX(var(--sparkle-drift)); opacity: 0; }
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

function spawnSparkle(container: HTMLDivElement) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.textContent = "·";
  const size = 10 + Math.random() * 14;
  el.style.fontSize = size + "px";
  el.style.color = "rgba(255,255,255,0.8)";
  el.style.left = Math.random() * 100 + "%";
  el.style.bottom = "0";
  el.style.pointerEvents = "none";
  const drift = (Math.random() - 0.5) * 80;
  const peakOpacity = 0.4 + Math.random() * 0.5;
  el.style.setProperty("--sparkle-drift", drift + "px");
  el.style.setProperty("--sparkle-peak-opacity", String(peakOpacity));
  const duration = 6 + Math.random() * 8;
  el.style.animation = `sparkle-rise ${duration}s ease-out forwards`;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration * 1000);
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
    el.style.left = "0";
    el.style.top = "0";
    const goingUp = Math.random() > 0.5;
    const duration = 20 + Math.random() * 8;
    el.style.animation = `${goingUp ? "sky-fly-diagonal-up" : "sky-fly-diagonal-down"} ${duration}s linear forwards`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000);
  }
}

export default function SkyAnimationClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const darkContainerRef = useRef<HTMLDivElement | null>(null);
  const darkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    function startDarkSparkles() {
      injectStyles();
      darkContainerRef.current = createContainer();
      darkIntervalRef.current = setInterval(
        () => {
          if (darkContainerRef.current) spawnSparkle(darkContainerRef.current);
        },
        400 + Math.random() * 600
      );
    }

    function stopDarkSparkles() {
      if (darkIntervalRef.current) {
        clearInterval(darkIntervalRef.current);
        darkIntervalRef.current = null;
      }
      if (darkContainerRef.current) {
        darkContainerRef.current.remove();
        darkContainerRef.current = null;
      }
    }

    function isMobile() {
      return window.matchMedia("(max-width: 767px)").matches;
    }

    function update() {
      const isDark = document.documentElement.classList.contains("dark");
      if (!isDark && !isMobile() && !containerRef.current) {
        start();
      } else if ((isDark || isMobile()) && containerRef.current) {
        stop();
      }
      if (isDark && !darkContainerRef.current) {
        startDarkSparkles();
      } else if (!isDark && darkContainerRef.current) {
        stopDarkSparkles();
      }
    }

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mql = window.matchMedia("(max-width: 767px)");
    mql.addEventListener("change", update);

    return () => {
      observer.disconnect();
      mql.removeEventListener("change", update);
      stop();
      stopDarkSparkles();
    };
  }, []);

  return null;
}
