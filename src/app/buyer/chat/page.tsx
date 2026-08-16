import { Bot, Database, FileCheck2, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatPanel } from "@/components/shared/chat-panel";
import { conversation, primaryVendor } from "@/lib/dummy-data";

export default function BuyerChatPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Agentic Chat"
        title="Ask CloudNova's AI"
        description="Grounded in CloudNova's Solution DNA and your Client Reality Profile — never a generic chatbot."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-[640px] lg:col-span-2">
          <ChatPanel initialMessages={conversation} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Grounded in
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              <ContextRow icon={Database} label={`${primaryVendor.name} Solution DNA`} detail="6 sources, 10 capabilities" />
              <ContextRow icon={ShoppingBag} label="Client Reality Profile" detail="Meridian Retail Group" />
              <ContextRow icon={FileCheck2} label="Solution Model v3" detail="Updated today" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-foreground">How this stays honest</p>
              <p className="mt-2 text-sm text-muted">
                Every answer is checked against verified evidence before it reaches you. If nothing supports a
                confident answer, the AI says so — and routes it to a CloudNova specialist instead of guessing.
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
