"use client";

import dynamic from "next/dynamic";

const ParallaxCloudClient = dynamic(() => import("./ParallaxCloudClient"), {
  ssr: false,
});

export default function ParallaxCloud() {
  return <ParallaxCloudClient />;
}
