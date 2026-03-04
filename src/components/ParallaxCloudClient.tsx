"use client";

import { ParallaxProvider, useParallax } from "react-scroll-parallax";

function ParallaxCloudInner() {
  const { ref } = useParallax<HTMLDivElement>({
    translateY: [10, -10],
    startScroll: 0,
    endScroll: 2000,
  });

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-[1] w-[750px] max-w-[90vw]"
      style={{ right: "-187px", bottom: "-10%" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/single-day-cloud-large.svg"
        className="dark:hidden w-full"
        alt=""
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/single-night-cloud-large.svg"
        className="hidden dark:block w-full"
        alt=""
      />
    </div>
  );
}

export default function ParallaxCloudClient() {
  return (
    <ParallaxProvider>
      <ParallaxCloudInner />
    </ParallaxProvider>
  );
}
