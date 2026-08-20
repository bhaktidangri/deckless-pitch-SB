"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Building2, CheckCircle2, Mail, ShoppingBag, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";

// Passwordless auth means "sign up" and "sign in" are the same mechanism —
// Supabase creates the auth.users row automatically the first time an email
// verifies its magic link. This page exists for the "I'm new here" framing
// and copy, but sends the exact same signInWithOtp call as /login. Company
// details (name, website, industry...) aren't collected here — they're
// captured by the real Discover / vendor onboarding flow right after first
// sign-in, which is also what actually creates the buyer/vendor record.
export default function SignupPage() {
  const [role, setRole] = useState<"vendor" | "buyer">("buyer");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback?role=${role}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (otpError) throw otpError;
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the sign-in link.");
      setStatus("error");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Tell us which side of the platform you&apos;re joining, then verify your email — no password needed.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "sent" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-verified-bg text-verified">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">Check your email</p>
              <p className="max-w-xs text-sm text-muted">
                We sent a verification link to <span className="font-medium text-foreground">{email}</span>. Open it on this device
                — we&apos;ll take you straight to {role === "vendor" ? "vendor onboarding" : "discovery"}.
              </p>
              <button type="button" onClick={() => setStatus("idle")} className="mt-2 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-2 p-1">
                <RoleTab active={role === "buyer"} onClick={() => setRole("buyer")} icon={ShoppingBag} label="I'm a Buyer" />
                <RoleTab active={role === "vendor"} onClick={() => setRole("vendor")} icon={Building2} label="I'm a Vendor" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Work email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                {status === "error" && error && (
                  <div className="flex items-start gap-2 rounded-lg border border-escalated-border bg-escalated-bg px-3 py-2.5 text-sm text-escalated">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" loading={status === "sending"}>
                  Continue as {role === "vendor" ? "Vendor" : "Buyer"} <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RoleTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all",
        active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
