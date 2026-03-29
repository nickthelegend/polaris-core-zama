"use client";

import { ReactNode } from "react";

// Convex removed — using MongoDB via API routes instead
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
