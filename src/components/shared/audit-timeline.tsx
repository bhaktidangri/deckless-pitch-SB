import { Bot, CheckCircle2 } from "lucide-react";
import { ResponseStatusBadge } from "@/components/shared/status-badge";
import type { AuditEvent } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="relative space-y-0">
      {events.map((event, i) => (
        <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i !== events.length - 1 && (
            <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" />
          )}
          <div
            className={cn(
              "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
              event.humanVerified
                ? "border-verified-border bg-verified-bg text-verified"
                : "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300"
            )}
          >
            {event.humanVerified ? <CheckCircle2 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{event.action}</p>
              <ResponseStatusBadge status={event.confidence} className="scale-90" />
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {event.entityType}: <span className="text-foreground">{event.entityName}</span>
            </p>
            <p className="mt-1 text-xs text-subtle">
              {event.agentName} &middot; {formatRelativeTime(event.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
