import { Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Requirement } from "@/lib/types";
import { cn } from "@/lib/utils";

const priorityColor: Record<Requirement["priority"], string> = {
  high: "bg-escalated",
  medium: "bg-modelled",
  low: "bg-subtle",
};

export function RequirementCard({ requirement }: { requirement: Requirement }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", priorityColor[requirement.priority])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{requirement.text}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <Badge variant="outline" size="sm" className="capitalize">
            {requirement.priority} priority
          </Badge>
          <span className="flex items-center gap-1 text-[11px] text-subtle">
            {requirement.source === "ai_inferred" ? <Sparkles className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {requirement.source === "ai_inferred" ? "AI inferred" : "You provided this"}
          </span>
        </div>
      </div>
    </div>
  );
}
