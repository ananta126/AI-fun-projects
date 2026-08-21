import type { TimelineEvent } from "@/types";
import { Card } from "@/components/ui/Card";

const channelLabel = {
  slack: "Secure message",
  email: "Internal email",
  note: "Case note",
  system: "System",
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={`${event.time}-${event.from}`}>
          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-muted">
              <span className="font-mono text-teal">{event.time}</span>
              <span>·</span>
              <span>{channelLabel[event.channel]}</span>
              <span>·</span>
              <span className="text-text/80">{event.from}</span>
            </div>
            {event.subject ? (
              <div className="mb-1 font-medium text-text">{event.subject}</div>
            ) : null}
            <p className="text-sm leading-6 text-muted">{event.body}</p>
          </Card>
        </li>
      ))}
    </ol>
  );
}
