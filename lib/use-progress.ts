"use client";

import { emptyProgress, loadEvents, loadProgress, subscribeProgress } from "@/lib/progress";
import { useSyncExternalStore } from "react";

export function useProgress() {
  return useSyncExternalStore(subscribeProgress, loadProgress, emptyProgress);
}

export function useAnalyticsEvents() {
  return useSyncExternalStore(subscribeProgress, loadEvents, () => []);
}
