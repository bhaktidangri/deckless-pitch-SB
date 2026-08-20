"use client";

import { useEffect, useState } from "react";
import { CheckCheck, Clock, Mail, MousePointerClick, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordVendorOutreach } from "@/lib/api/account";
import { getVendorOutreachEvents, type VendorOutreachEventRow } from "@/lib/api/vendor-lookup";
import { formatRelativeTime } from "@/lib/utils";

interface EmailBuyerCardProps {
  vendorId: string;
  buyerId: string;
  buyerCompanyName: string;
  buyerEmail: string | null;
  vendorCompanyName: string;
}

// Logs the outreach through record-vendor-outreach (real backend tracking —
// feeds the vendor dashboard's outreach stat and this buyer's history below)
// which — when SENDGRID_API_KEY is configured server-side — also actually
// sends it via SendGrid. emailStatus on the response says whether that really
// happened: "sent" means it's genuinely on its way (no mailto: needed),
// "not_sent"/"failed" fall back to opening the vendor's own email client so
// the message still gets out one way or another.
export function EmailBuyerCard({ vendorId, buyerId, buyerCompanyName, buyerEmail, vendorCompanyName }: EmailBuyerCardProps) {
  const [subject, setSubject] = useState(`${vendorCompanyName} <> ${buyerCompanyName}`);
  const [message, setMessage] = useState(
    `Hi ${buyerCompanyName} team,\n\nWe noticed you're exploring solutions like ours and wanted to reach out directly. Happy to walk through fit whenever works for you.\n\n— ${vendorCompanyName}`
  );
  const [sending, setSending] = useState(false);
  const [sentState, setSentState] = useState<"sent" | "mailto" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VendorOutreachEventRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getVendorOutreachEvents(vendorId)
      .then((events) => {
        if (!cancelled) setHistory(events.filter((e) => e.buyerId === buyerId));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId, buyerId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSentState(null);
    try {
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();
      const result = await recordVendorOutreach({ buyerId, subject: trimmedSubject, message: trimmedMessage });
      setHistory((prev) => [
        {
          id: result.id,
          buyerId,
          channel: "email",
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
      } else if (result.buyerEmail) {
        // Not really sent yet (no provider configured, or the send failed) —
        // fall back to the vendor's own email client so the message still
        // goes out.
        setSentState("mailto");
        window.location.href = `mailto:${result.buyerEmail}?subject=${encodeURIComponent(trimmedSubject)}&body=${encodeURIComponent(trimmedMessage)}`;
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
          <Mail className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Email this buyer
        </CardTitle>
        <CardDescription>
          {buyerEmail
            ? `Sends a real email to ${buyerEmail} and tracks opens/clicks below — falls back to your own email client if delivery isn't configured yet.`
            : "This buyer hasn't linked a login email yet, so this only logs your outreach for now."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <Label htmlFor="outreach-subject">Subject</Label>
            <Input id="outreach-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="outreach-message">Message</Label>
            <Textarea id="outreach-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>

          {error && <p className="text-sm text-escalated">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={sending} disabled={sending}>
              <Send className="h-4 w-4" /> {buyerEmail ? "Send email" : "Log outreach"}
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
