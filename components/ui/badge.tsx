import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "purple"
  | "yellow";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClassNames: Record<BadgeVariant, string> = {
  default: "status-badge status-badge--neutral",
  success: "status-badge status-badge--success",
  warning: "status-badge status-badge--warning",
  danger: "status-badge status-badge--danger",
  accent: "status-badge status-badge--accent",
  purple: "status-badge status-badge--purple",
  yellow: "status-badge status-badge--yellow",
};

export function Badge({ variant = "default", className, style, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(variantClassNames[variant], className)}
      style={style}
      {...props}
    >
      {children}
    </span>
  );
}
