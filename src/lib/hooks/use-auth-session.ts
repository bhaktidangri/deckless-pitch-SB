"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase-client";

export interface AuthSessionState {
  session: Session | null;
  email: string | null;
  loading: boolean;
}

// Reactive read of the current Supabase Auth session — mirrors the
// use-buyer-session.ts / use-vendor-session pattern (subscribe once, react
// to changes for the life of the component) instead of a one-shot read that
// goes stale the moment a magic-link sign-in completes in another tab or the
// /auth/callback page finishes next to a long-lived layout.
export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, email: session?.user?.email ?? null, loading };
}
