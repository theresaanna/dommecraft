"use client";

import { useEffect, useRef } from "react";
import "sparklefall/dist/sparklefall.css";

export default function SparkleEffect() {
  const instanceRef = useRef<unknown>(null);

  useEffect(() => {
    import("sparklefall").then(({ default: SparkleFall }) => {
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
    });

    return () => {
      if (instanceRef.current) {
        (instanceRef.current as { destroy: () => void }).destroy();
        instanceRef.current = null;
      }
    };
  }, []);

  return null;
}
