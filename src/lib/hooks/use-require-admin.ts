"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { resolveAccountSession } from "@/lib/api/account";

// Stronger than useRequireAuth: being logged in isn't enough for /admin —
// the email also has to be on admin_allowlist (checked server-side by
// resolve-account-session, never trusted client-side). A logged-in buyer or
// vendor who navigates straight to an /admin URL is bounced to the
// marketing home rather than shown admin data.
export function useRequireAdmin(): { ready: boolean } {
  const { session, loading } = useAuthSession();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    resolveAccountSession()
      .then((result) => {
        if (cancelled) return;
        setIsAdmin(result.isAdmin);
        setChecked(true);
        if (!result.isAdmin) router.replace("/");
      })
      .catch(() => {
        if (!cancelled) {
          setChecked(true);
          router.replace("/");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loading, session, router]);

  return { ready: checked && isAdmin };
}
