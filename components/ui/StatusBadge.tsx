import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusBadgeVariant =
  | "request"
  | "pending"
  | "review"
  | "approved"
  | "rejected"
  | "active"
  | "expired"
  | "neutral";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  dotColor?: string;
}

const baseClassName =
  "inline-flex min-h-[20px] items-center gap-1.5 whitespace-nowrap rounded-full border-0 px-2.5 py-[3px] text-[11px] font-semibold leading-none shadow-none outline-none ring-0";

const variantClassNames: Record<StatusBadgeVariant, string> = {
  request: "bg-[var(--accent-light)] text-[var(--accent)]",
  pending: "bg-[var(--accent-light)] text-[var(--accent)]",
  review: "bg-[var(--warning-light)] text-[#b45309]",
  approved: "bg-[var(--success-light)] text-[#15803d]",
  rejected: "bg-[var(--danger-light)] text-[var(--danger)]",
  active: "bg-[var(--success-light)] text-[#15803d]",
  expired: "bg-[var(--danger-light)] text-[var(--danger)]",
  neutral: "bg-[var(--surface-3)] text-[var(--text-secondary)]",
};

export function StatusBadge({
  variant = "neutral",
  dotColor,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(baseClassName, variantClassNames[variant], className)} {...props}>
      {dotColor ? (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
          style={{ backgroundColor: dotColor }}
        />
      ) : null}
      {children}
    </span>
  );
}
