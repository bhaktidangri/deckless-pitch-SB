"use client";

import { Bot, Database, FileCheck2, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveChatPanel } from "@/components/shared/live-chat-panel";
import { getStoredBuyerId, getStoredBuyerWorkflowRunIds, getStoredCompanyName, getStoredSelectedVendorName } from "@/lib/buyer-session";

export default function BuyerChatPage() {
  const buyerId = getStoredBuyerId();
  const vendorName = getStoredSelectedVendorName();
  const companyName = getStoredCompanyName();

  return (
    <div>
      <PageHeader
        eyebrow="Grounded Exploration"
        title={vendorName ? `Ask ${vendorName}'s AI` : "Ask AI"}
        description="Grounded in your selected vendor's Solution DNA and your Client Reality Profile — never a generic chatbot."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-[640px] lg:col-span-2">
          <LiveChatPanel buyerId={buyerId} workflowRunIds={getStoredBuyerWorkflowRunIds()} nodeKey="query_workspace_evidence" />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Grounded in
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              <ContextRow icon={Database} label={`${vendorName ?? "Vendor"} Solution DNA`} detail="Published capabilities + evidence" />
              <ContextRow icon={ShoppingBag} label="Client Reality Profile" detail={companyName ?? "Your company"} />
              <ContextRow icon={FileCheck2} label="Current solution model" detail="Latest ROI projection" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-foreground">How this stays honest</p>
              <p className="mt-2 text-sm text-muted">
                Every answer is checked against verified evidence before it reaches you. If nothing supports a
                confident answer, the AI says so — and routes it to a specialist instead of guessing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContextRow({ icon: Icon, label, detail }: { icon: React.ElementType; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-surface-2 p-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-subtle">{detail}</p>
      </div>
    </div>
  );
}
