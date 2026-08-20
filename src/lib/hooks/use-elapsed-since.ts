"use client";

// Ticks off elapsed time from a real timestamp (e.g. buyer_workflow_runs.
// started_at) rather than from the moment some component happened to mount.
// A wait card that instead starts its own clock at mount resets to "0s"
// every time the buyer navigates away and back mid-run, which reads as "did
// navigating away restart the agent?" even though the run itself never
// stopped — this is what makes the readout survive that round trip. Falls
// back to counting from first render if no real start time is known yet
// (e.g. it hasn't loaded from Supabase yet yet), and re-anchors once it does.
import { useEffect, useRef, useState } from "react";

export function useElapsedSince(startedAt: string | null | undefined): number {
  const [elapsed, setElapsed] = useState(0);
  const mountedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (mountedAtRef.current === null) mountedAtRef.current = Date.now();
    const startMs = startedAt ? new Date(startedAt).getTime() : mountedAtRef.current;
    const tick = () => setElapsed(Math.max(0, Date.now() - startMs));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}
