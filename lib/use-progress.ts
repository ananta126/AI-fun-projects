"use client";

import { EMPTY_PROGRESS, loadEvents, loadProgress, subscribeProgress } from "@/lib/progress";
import { useSyncExternalStore } from "react";

const EMPTY_EVENTS: never[] = [];

export function useProgress() {
  return useSyncExternalStore(subscribeProgress, loadProgress, () => EMPTY_PROGRESS);
}

export function useAnalyticsEvents() {
  return useSyncExternalStore(subscribeProgress, loadEvents, () => EMPTY_EVENTS);
}
