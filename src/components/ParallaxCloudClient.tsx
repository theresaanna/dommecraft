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
      className="fixed pointer-events-none z-0 w-[750px] max-w-[90vw]"
      style={{ right: "-227px", bottom: "calc(-10% - 50px)" }}
    >
      {/* Large clouds for desktop */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/single-day-cloud-large.svg"
        className="dark:hidden w-full hidden sm:block"
        alt=""
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/single-night-cloud-large.svg"
        className="hidden dark:sm:block w-full"
        alt=""
      />
      {/* Small clouds for mobile */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/single-day-cloud-small.svg"
        className="dark:hidden w-full sm:hidden"
        alt=""
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/single-night-cloud-small.svg"
        className="hidden dark:block w-full sm:hidden dark:sm:hidden"
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
