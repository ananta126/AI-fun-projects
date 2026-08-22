import type { TimelineEvent } from "@/types";
import { Card } from "@/components/ui/Card";

const channelLabel: Record<TimelineEvent["channel"], string> = {
  slack: "Secure message",
  email: "Internal email",
  note: "Case note",
  system: "System",
  update: "Case update",
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id ?? `${event.time}-${event.from}`}>
          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-muted">
              <span className="font-mono text-teal">{event.time}</span>
              <span>·</span>
              <span>{channelLabel[event.channel]}</span>
            </div>
            <div className="mb-1 text-sm font-medium text-text">{event.from}</div>
            {event.subject ? (
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-dim">
                {event.subject}
              </div>
            ) : null}
            <p className="whitespace-pre-line text-sm leading-6 text-muted">{event.body}</p>
          </Card>
        </li>
      ))}
    </ol>
  );
}
