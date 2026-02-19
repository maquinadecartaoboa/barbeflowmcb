"use client";

import dynamic from "next/dynamic";

// Dynamically import the dashboard app with SSR disabled
// since it uses React Router and browser-only APIs
const DashboardApp = dynamic(() => import("@/components/DashboardApp"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20" />
        <div className="h-2 w-24 bg-muted rounded" />
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardApp />;
}
