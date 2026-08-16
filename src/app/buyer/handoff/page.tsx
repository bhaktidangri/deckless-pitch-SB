"use client";

import { useState } from "react";
import { CalendarCheck2, CheckCircle2, Clock, UserCheck, Video } from "lucide-react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FrontierCard } from "@/components/shared/frontier-card";
import { capabilityFrontierItems, primaryVendor } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

const slots = [
  { id: "s1", label: "Wed, Aug 19", time: "10:00 AM IST" },
  { id: "s2", label: "Wed, Aug 19", time: "3:30 PM IST" },
  { id: "s3", label: "Thu, Aug 20", time: "11:00 AM IST" },
  { id: "s4", label: "Fri, Aug 21", time: "2:00 PM IST" },
];

export default function HandoffPage() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const openItems = capabilityFrontierItems.filter((f) => f.status !== "resolved" && f.status !== "closed");

  return (
    <div>
      <PageHeader
        eyebrow="Human Handoff"
        title="Ready for expert discussion?"
        description={`${openItems.length} question${openItems.length === 1 ? "" : "s"} require ${primaryVendor.name} confirmation before closure.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {openItems.map((item) => (
            <FrontierCard key={item.id} item={item} />
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          {!confirmed ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Schedule with Solutions Team
                </CardTitle>
                <CardDescription>Your context package is prepared automatically — no need to re-explain anything.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="mb-4 space-y-2">
                  <ContextItem icon={UserCheck} text="Recommended: Solutions Architect" />
                  <ContextItem icon={Video} text="30-minute video call" />
                </div>
                <p className="mb-2 text-xs font-medium text-subtle">Choose a time</p>
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={cn(
                        "rounded-lg border p-2.5 text-left text-xs transition-colors",
                        selectedSlot === slot.id
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                          : "border-border bg-surface hover:border-border-strong"
                      )}
                    >
                      <p className="font-medium text-foreground">{slot.label}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-subtle"><Clock className="h-3 w-3" /> {slot.time}</p>
                    </button>
                  ))}
                </div>
                <Button className="mt-4 w-full" disabled={!selectedSlot} onClick={() => setConfirmed(true)}>
                  Confirm meeting
                </Button>
              </CardContent>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <CardContent className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-verified-bg">
                  <CheckCircle2 className="h-7 w-7 text-verified" />
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">Meeting scheduled</p>
                <p className="mt-1 text-sm text-muted">
                  {slots.find((s) => s.id === selectedSlot)?.label} at {slots.find((s) => s.id === selectedSlot)?.time}
                </p>
                <Badge variant="verified" className="mt-4">
                  Context package sent to CloudNova
                </Badge>
                <p className="mt-4 text-xs text-subtle">
                  Your Solutions Architect will arrive prepared with your full discovery history, gap analysis,
                  and the {openItems.length} unresolved question{openItems.length === 1 ? "" : "s"} above.
                </p>
              </CardContent>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ContextItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <Icon className="h-3.5 w-3.5 text-subtle" /> {text}
    </div>
  );
}
