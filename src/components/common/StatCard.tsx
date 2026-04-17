import clsx from "clsx";
import type { ReactNode } from "react";
import { CountUp } from "./CountUp";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "primary",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}) {
  const accents: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    danger: "text-destructive bg-destructive/10",
    neutral: "text-muted-foreground bg-muted",
  };
  // Auto-animate plain integer values
  const display =
    typeof value === "number" && Number.isFinite(value) ? <CountUp value={value} /> : value;
  return (
    <div className={clsx("glass rounded-xl p-4 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon && <span className={clsx("h-7 w-7 rounded-md flex items-center justify-center", accents[accent])}>{icon}</span>}
      </div>
      <div className="text-2xl font-semibold tracking-tight font-mono">{display}</div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
