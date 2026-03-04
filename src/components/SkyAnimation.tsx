"use client";

import dynamic from "next/dynamic";

const SkyAnimationClient = dynamic(
  () => import("@/components/SkyAnimationClient"),
  { ssr: false }
);

export default function SkyAnimation() {
  return <SkyAnimationClient />;
}
