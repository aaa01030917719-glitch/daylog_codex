import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: "#F0F0F0", color: "#555555" },
  success: { background: "#E8F7EE", color: "#2A8C50" },
  warning: { background: "#FFF8E6", color: "#D4A200" },
  danger: { background: "#FDECEA", color: "#D93025" },
  accent: { background: "#FEF0E8", color: "#F56B23" },
};

export function Badge({ variant = "default", className, style, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </span>
  );
}
