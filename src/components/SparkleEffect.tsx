"use client";

import { useEffect, useRef } from "react";
import "sparklefall/dist/sparklefall.css";
import SparkleFall from "sparklefall";

export default function SparkleEffect() {
  const instanceRef = useRef<SparkleFall | null>(null);

  useEffect(() => {
    function update() {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark && !instanceRef.current) {
        instanceRef.current = new SparkleFall({
          interval: 100,
          wind: 0,
          maxSparkles: 100,
          minSize: 2,
          maxSize: 4,
          minDuration: 1,
          maxDuration: 2,
          sparkles: ["\u00b7"],
          colors: ["rgba(255,255,255,0.8)"],
        });
      } else if (!isDark && instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
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
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, []);

  return null;
}
