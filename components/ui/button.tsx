import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,255,0.18)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_12px_20px_rgba(79,124,255,0.18)] hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)]",
        outline:
          "border border-[var(--border)] bg-white text-[var(--text-secondary)] shadow-sm hover:border-[#d7dce4] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
        ghost:
          "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
        link:
          "px-0 text-[var(--accent)] underline-offset-4 hover:underline",
        destructive:
          "border border-[#f3c1c1] bg-[var(--danger-light)] text-[#b42318] hover:bg-[#fecaca]",
        success:
          "border border-[#bae8c9] bg-[var(--success-light)] text-[#15803d] hover:bg-[#bbf7d0]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
