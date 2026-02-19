"use client";

import dynamic from "next/dynamic";

const LandingPage = dynamic(() => import("@/views/Landing"), { ssr: false });

export default function LandingWrapper() {
  return <LandingPage />;
}
