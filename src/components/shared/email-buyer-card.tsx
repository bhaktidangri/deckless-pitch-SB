"use client";

import { useEffect, useState } from "react";
import { Clock, Mail, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
// then, if the buyer's login email is on file, opens the vendor's own email
// client via mailto: to actually send it. There's no transactional email
// provider wired into this app, so "send" here means "hand off to your own
// inbox" rather than a backend relay — the logging is what's real and
// durable, not a simulated delivery receipt.
export function EmailBuyerCard({ vendorId, buyerId, buyerCompanyName, buyerEmail, vendorCompanyName }: EmailBuyerCardProps) {
  const [subject, setSubject] = useState(`${vendorCompanyName} <> ${buyerCompanyName}`);
  const [message, setMessage] = useState(
    `Hi ${buyerCompanyName} team,\n\nWe noticed you're exploring solutions like ours and wanted to reach out directly. Happy to walk through fit whenever works for you.\n\n— ${vendorCompanyName}`
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
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
    setSent(false);
    try {
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();
      const result = await recordVendorOutreach({ buyerId, subject: trimmedSubject, message: trimmedMessage });
      setHistory((prev) => [
        { id: result.id, buyerId, channel: "email", subject: trimmedSubject, message: trimmedMessage, createdAt: result.createdAt },
        ...prev,
      ]);
      setSent(true);
      if (result.buyerEmail) {
        window.location.href = `mailto:${result.buyerEmail}?subject=${encodeURIComponent(trimmedSubject)}&body=${encodeURIComponent(trimmedMessage)}`;
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
            ? `Opens your email client addressed to ${buyerEmail} — also logged below for tracking.`
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
              <Send className="h-4 w-4" /> {buyerEmail ? "Open email" : "Log outreach"}
            </Button>
            {sent && <span className="text-sm text-verified">Logged.</span>}
          </div>
        </form>

        {!historyLoading && history.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Past outreach</p>
            <div className="space-y-2">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="flex items-start gap-2 text-sm">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" />
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{h.subject ?? "(no subject)"}</p>
                    <p className="text-xs text-subtle">{formatRelativeTime(h.createdAt)}</p>
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
