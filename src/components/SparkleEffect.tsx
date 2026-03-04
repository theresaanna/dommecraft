"use client";

import dynamic from "next/dynamic";

const SparkleEffectClient = dynamic(
  () => import("@/components/SparkleEffectClient"),
  { ssr: false }
);

export default function SparkleEffect() {
  return <SparkleEffectClient />;
}
