"use client";

import { useEffect, useState } from "react";
import { CheckCheck, Clock, Mail, MousePointerClick, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordBuyerOutreach } from "@/lib/api/account";
import { getBuyerOutreachEvents, type BuyerOutreachEventRow } from "@/lib/api/buyer-lookup";
import { formatRelativeTime } from "@/lib/utils";

interface EmailVendorCardProps {
  buyerId: string;
  vendorId: string;
  vendorCompanyName: string;
  vendorEmail: string | null;
  buyerCompanyName: string;
}

// Reverse direction of EmailBuyerCard — lets a buyer email their vendor
// directly from /buyer/chat (Ask AI), instead of only ever being contacted
// BY the vendor. Logs through record-buyer-outreach (real backend tracking,
// separate from the vendor's own outreach log) which — when
// SENDGRID_API_KEY is configured server-side — also actually sends it via
// SendGrid.
export function EmailVendorCard({ buyerId, vendorId, vendorCompanyName, vendorEmail, buyerCompanyName }: EmailVendorCardProps) {
  const [subject, setSubject] = useState(`${buyerCompanyName} <> ${vendorCompanyName}`);
  const [message, setMessage] = useState(
    `Hi ${vendorCompanyName} team,\n\nWe're evaluating your solution and wanted to reach out directly with a few questions. Happy to talk whenever works for you.\n\n— ${buyerCompanyName}`
  );
  const [sending, setSending] = useState(false);
  const [sentState, setSentState] = useState<"sent" | "mailto" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BuyerOutreachEventRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBuyerOutreachEvents(buyerId)
      .then((events) => {
        if (!cancelled) setHistory(events.filter((e) => e.vendorId === vendorId));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buyerId, vendorId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSentState(null);
    try {
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();
      const result = await recordBuyerOutreach({ vendorId, subject: trimmedSubject, message: trimmedMessage });
      setHistory((prev) => [
        {
          id: result.id,
          vendorId,
          subject: trimmedSubject,
          message: trimmedMessage,
          createdAt: result.createdAt,
          emailStatus: result.emailStatus,
          emailError: result.emailError,
          openedAt: null,
          openCount: 0,
          clickedAt: null,
          clickCount: 0,
        },
        ...prev,
      ]);
      if (result.emailStatus === "sent") {
        setSentState("sent");
      } else if (result.vendorEmail) {
        setSentState("mailto");
        window.location.href = `mailto:${result.vendorEmail}?subject=${encodeURIComponent(trimmedSubject)}&body=${encodeURIComponent(trimmedMessage)}`;
      } else {
        setSentState("sent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log this outreach.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Email this vendor
        </CardTitle>
        <CardDescription>
          {vendorEmail
            ? `Sends a real email to ${vendorEmail} and tracks opens/clicks below — falls back to your own email client if delivery isn't configured yet.`
            : "This vendor hasn't linked a login email yet, so this only logs your outreach for now."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <Label htmlFor="vendor-outreach-subject">Subject</Label>
            <Input id="vendor-outreach-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="vendor-outreach-message">Message</Label>
            <Textarea id="vendor-outreach-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>

          {error && <p className="text-sm text-escalated">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={sending} disabled={sending}>
              <Send className="h-4 w-4" /> {vendorEmail ? "Send email" : "Log outreach"}
            </Button>
            {sentState === "sent" && <span className="text-sm text-verified">Sent.</span>}
            {sentState === "mailto" && <span className="text-sm text-modelled">Logged — opened in your email client.</span>}
          </div>
        </form>

        {!historyLoading && history.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Past outreach</p>
            <div className="space-y-2">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="flex items-start gap-2 text-sm">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{h.subject ?? "(no subject)"}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs text-subtle">{formatRelativeTime(h.createdAt)}</p>
                      {h.emailStatus === "sent" && (
                        <Badge variant="verified" size="sm" className="gap-1">
                          <CheckCheck className="h-3 w-3" /> Sent
                        </Badge>
                      )}
                      {h.emailStatus === "failed" && (
                        <Badge variant="escalated" size="sm">Failed to send</Badge>
                      )}
                      {h.openCount > 0 && (
                        <Badge variant="brand" size="sm">Opened{h.openCount > 1 ? ` ×${h.openCount}` : ""}</Badge>
                      )}
                      {h.clickCount > 0 && (
                        <Badge variant="modelled" size="sm" className="gap-1">
                          <MousePointerClick className="h-3 w-3" /> Clicked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
