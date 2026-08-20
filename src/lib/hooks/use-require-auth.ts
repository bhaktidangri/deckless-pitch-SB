"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/hooks/use-auth-session";

// Route guard shared by buyer/vendor/admin layouts — real login now gates
// every portal (previously any of the three was reachable just by knowing
// the URL). Redirects to /login the moment we're sure there's no session;
// `ready` stays false while that determination is still in flight so the
// caller can hold off rendering portal content for a beat instead of
// flashing it before the redirect fires.
export function useRequireAuth(): { ready: boolean } {
  const { session, loading } = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  return { ready: !loading && !!session };
}
