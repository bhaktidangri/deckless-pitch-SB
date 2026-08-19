"use client";

import { Button } from "@/components/ui/button";

// Renders one buyer-workflow human_approval node's options as buttons —
// this is a genuine button-choice UI per PRD §7.1 (Ask Human for Approval
// can only register a click, never typed text), used by every node that's
// legitimately closed-ended (Confirm Vendor Selection, Adaptive Discovery
// Questioning, Approve Human Handoff).
export function ApprovalButtons({
  options,
  responding,
  onChoose,
  includeSkip,
}: {
  options: { id: string; label: string }[];
  responding: boolean;
  onChoose: (optionId: string) => void;
  includeSkip?: boolean;
}) {
  const hasOptions = options.length > 0;
  return (
    <div className="flex flex-wrap gap-2">
      {hasOptions ? (
        options.map((opt) => (
          <Button key={opt.id} size="sm" variant="secondary" disabled={responding} loading={responding} onClick={() => onChoose(opt.id)}>
            {opt.label}
          </Button>
        ))
      ) : (
        <>
          <Button size="sm" variant="secondary" disabled={responding} loading={responding} onClick={() => onChoose("yes")}>
            Yes
          </Button>
          <Button size="sm" variant="secondary" disabled={responding} loading={responding} onClick={() => onChoose("no")}>
            No
          </Button>
        </>
      )}
      {includeSkip && (
        <Button size="sm" variant="ghost" disabled={responding} onClick={() => onChoose("skip")}>
          Skip — I&apos;ll answer this elsewhere
        </Button>
      )}
    </div>
  );
}
