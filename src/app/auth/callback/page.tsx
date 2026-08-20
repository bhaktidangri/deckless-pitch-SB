"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { getSupabaseClient } from "@/lib/supabase-client";
import { resolveAccountSession } from "@/lib/api/account";
import { setStoredBuyerId, setStoredCompanyName } from "@/lib/buyer-session";
import { setStoredVendorId, setStoredVendorName } from "@/lib/vendor-session";

// Lands here right after the magic-link email is opened. supabase-js's
// browser client auto-detects the session from the URL (detectSessionInUrl
// in supabase-client.ts) as soon as it initializes, so this page just waits
// for that SIGNED_IN event, then asks resolve-account-session which
// business record (if any) this verified email is linked to and routes
// accordingly — admin takes priority since an allow-listed email is always
// meant for /admin regardless of which role tab was picked at /login.
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleHint = searchParams.get("role") === "vendor" ? "vendor" : "buyer";
  const [error, setError] = useState<string | null>(null);
  const resolvedOnce = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function resolve() {
      if (resolvedOnce.current) return;
      resolvedOnce.current = true;
      try {
        const result = await resolveAccountSession();
        if (result.isAdmin) {
          router.replace("/admin");
        } else if (result.buyer) {
          setStoredBuyerId(result.buyer.id);
          setStoredCompanyName(result.buyer.companyName);
          router.replace("/buyer");
        } else if (result.vendor) {
          setStoredVendorId(result.vendor.id);
          setStoredVendorName(result.vendor.companyName);
          router.replace("/vendor/profile");
        } else if (roleHint === "vendor") {
          router.replace("/vendor/profile");
        } else {
          router.replace("/buyer/discover");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not complete sign-in.");
      }
    }

    // If the session is already there (fast case), resolve immediately;
    // otherwise wait for the SIGNED_IN event supabase-js fires once it's
    // finished parsing the magic-link tokens out of the URL.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) resolve();
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") resolve();
    });

    const timeout = setTimeout(() => {
      if (!resolvedOnce.current) setError("This sign-in link is invalid or has expired. Please request a new one.");
    }, 15000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <Card className="max-w-md p-6 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-escalated" />
        <p className="mt-3 text-sm font-medium text-foreground">Sign-in failed</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <a href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to sign in
        </a>
      </Card>
    );
  }

  return <AgentWaitingState variant="fullpage" title="Signing you in" description="Verifying your link and finding your workspace." />;
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<AgentWaitingState variant="fullpage" title="Signing you in" description="Verifying your link and finding your workspace." />}>
        <CallbackInner />
      </Suspense>
    </div>
  );
}
