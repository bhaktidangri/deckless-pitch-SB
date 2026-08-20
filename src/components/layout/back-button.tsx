"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton({
  href,
  label = "Back",
  className,
}: {
  /** Navigate to a fixed route instead of the browser's previous entry. */
  href?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground",
        className
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
