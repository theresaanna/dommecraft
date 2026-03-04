"use client";

import { useEffect, useRef } from "react";
import SparkleFall from "sparklefall";

export default function SparkleEffectClient() {
  const instanceRef = useRef<SparkleFall | null>(null);

  useEffect(() => {
    try {
      const instance = new SparkleFall({
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
      instanceRef.current = instance;

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
    } catch {
      // sparklefall init failed, ignore
    }
  }, []);

  return null;
}
