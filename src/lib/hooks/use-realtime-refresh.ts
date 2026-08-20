"use client";

// Supabase Realtime instead of blind fixed-interval polling — every one of
// this app's ~18 setInterval loops (buyer status, chat, solution workspace,
// vendor dashboards, ...) was re-fetching on a guess (4-20s) with no signal
// that anything had actually changed, which is exactly the class of
// staleness bug this session kept hitting. This subscribes to Postgres
// changes on the given table(s)/filter(s) and calls `onChange` (pass your
// page's existing load/refresh function) the instant a row really changes.
//
// This is additive to polling, not a replacement for it: a realtime socket
// can silently drop (backgrounded tab, network blip, Supabase Realtime
// hiccup) with nothing in this hook's contract to surface that. Callers
// should keep their existing setInterval running alongside this — just
// widen it, since it's now a safety net rather than the primary signal, not
// remove it.
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase-client";

export interface RealtimeWatch {
  table: string;
  /** PostgREST-style filter, e.g. `buyer_id=eq.${buyerId}` — omit to watch every row on the table. */
  filter?: string;
}

let channelCounter = 0;

export function useRealtimeRefresh(
  watches: (RealtimeWatch | false | null | undefined)[],
  onChange: () => void,
  deps: unknown[]
) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const active = watches.filter((w): w is RealtimeWatch => Boolean(w));
    if (active.length === 0) return;

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      return; // Not configured — the caller's polling fallback still covers this.
    }

    channelCounter += 1;
    let channel: RealtimeChannel = supabase.channel(`rt-${channelCounter}`);
    for (const w of active) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: w.table, filter: w.filter },
        () => onChangeRef.current()
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
