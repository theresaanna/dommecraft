"use client";

import { useEffect, useRef } from "react";
import SparkleFall from "sparklefall";

export default function SparkleEffectClient() {
  const instanceRef = useRef<SparkleFall | null>(null);

  useEffect(() => {
    function update() {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark && !instanceRef.current) {
        try {
          instanceRef.current = new SparkleFall({
            interval: 800,
            wind: 15,
            maxSparkles: 25,
            minSize: 10,
            maxSize: 20,
            minDuration: 6,
            maxDuration: 12,
            sparkles: ["·"],
            colors: ["rgba(255,255,255,0.8)"],
          });
        } catch {
          // sparklefall init failed, ignore
        }
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
