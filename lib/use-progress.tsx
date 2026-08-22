"use client";

import {
  EMPTY_PROGRESS,
  loadEvents,
  loadProgress,
  subscribeProgress,
} from "@/lib/progress";
import type { AnalyticsEvent, UserProgress } from "@/types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const ProgressContext = createContext<UserProgress>(EMPTY_PROGRESS);
const EventsContext = createContext<AnalyticsEvent[]>([]);

export function ProgressStoreProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(EMPTY_PROGRESS);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    const read = () => {
      setProgress(loadProgress());
      setEvents(loadEvents());
    };
    read();
    return subscribeProgress(read);
  }, []);

  return (
    <ProgressContext.Provider value={progress}>
      <EventsContext.Provider value={events}>{children}</EventsContext.Provider>
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  return useContext(ProgressContext);
}

export function useAnalyticsEvents() {
  return useContext(EventsContext);
}
