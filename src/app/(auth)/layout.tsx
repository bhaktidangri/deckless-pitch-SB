import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { ThemeToggle } from "@/components/theme-toggle";

const highlights = [
  "Register your Solution DNA once — not a deck per prospect",
  "AI-assisted discovery understands buyer context automatically",
  "Evidence-grounded answers, never an invented capability",
  "Human experts step in only when judgment is truly needed",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />
        <Link href="/" className="relative z-10 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">Deck-less Pitch</span>
        </Link>

        <div className="relative z-10">
          <p className="text-balance text-3xl font-bold leading-tight">
            No deck — a live model of your client&apos;s own business they explore themselves.
          </p>
          <ul className="mt-8 space-y-4">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-white/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/60">Hackathon MVP demo environment</p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6">
          <BackButton href="/" />
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold text-foreground">Deck-less Pitch</span>
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 pt-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
