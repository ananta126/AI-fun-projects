export type AnalyticsEvent =
  | "outfit_viewed"
  | "outfit_saved"
  | "outfit_unsaved"
  | "search_performed"
  | "filter_used"
  | "board_created"
  | "outfit_added_to_board"
  | "see_on_me_clicked"
  | "fit_analysis_viewed"
  | "product_clicked";

export interface AnalyticsPayload {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Analytics abstraction layer.
 * MVP logs locally; swap implementation for Segment, Mixpanel, etc.
 */
export function trackEvent(
  event: AnalyticsEvent,
  payload: AnalyticsPayload = {}
): void {
  if (typeof window === "undefined") return;

  const entry = {
    event,
    payload,
    timestamp: new Date().toISOString(),
  };

  console.info("[LOOKBOOK Analytics]", entry);

  try {
    const key = "lookbook_analytics";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing.slice(-200)));
  } catch {
    // ignore storage errors
  }
}
