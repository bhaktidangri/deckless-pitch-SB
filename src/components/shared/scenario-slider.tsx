"use client";

import { cn } from "@/lib/utils";

export function ScenarioSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
  formatValue,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-sm font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          {formatValue ? formatValue(value) : `${value}${suffix}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="scenario-range h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2"
        style={{
          background: `linear-gradient(to right, var(--brand-500) ${percent}%, var(--surface-2) ${percent}%)`,
        }}
      />
      <div className="mt-1 flex justify-between text-[11px] text-subtle">
        <span>{formatValue ? formatValue(min) : `${min}${suffix}`}</span>
        <span>{formatValue ? formatValue(max) : `${max}${suffix}`}</span>
      </div>
    </div>
  );
}
