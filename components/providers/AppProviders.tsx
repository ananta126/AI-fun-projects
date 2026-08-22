"use client";

import { ProgressStoreProvider } from "@/lib/use-progress";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return <ProgressStoreProvider>{children}</ProgressStoreProvider>;
}
