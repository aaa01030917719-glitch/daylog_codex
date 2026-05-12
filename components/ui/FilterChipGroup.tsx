"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type FilterChipSize = "sm" | "md";
type FilterChipVariant = "filter" | "view";

type ChipIcon = LucideIcon;

export interface FilterChipItem<TValue extends string> {
  value: TValue;
  label: ReactNode;
  count?: number;
  icon?: ChipIcon;
}

interface FilterChipGroupProps<TValue extends string> {
  items: Array<FilterChipItem<TValue>>;
  activeValue: TValue;
  onChange: (value: TValue) => void;
  "aria-label"?: string;
  className?: string;
  size?: FilterChipSize;
  variant?: FilterChipVariant;
}

const groupClassName =
  "flex max-w-full flex-wrap items-center justify-start gap-2";

const sizeClassNames: Record<FilterChipSize, string> = {
  sm: "h-[34px] px-3 text-[12px]",
  md: "h-9 px-4 text-[13px]",
};

const variantClassNames: Record<FilterChipVariant, string> = {
  filter: "rounded-full",
  view: "rounded-[12px]",
};

export function FilterChipGroup<TValue extends string>({
  items,
  activeValue,
  onChange,
  "aria-label": ariaLabel,
  className,
  size = "md",
  variant = "filter",
}: FilterChipGroupProps<TValue>) {
  return (
    <div className={`${groupClassName}${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = activeValue === item.value;
        const Icon = item.icon;

        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(item.value)}
            className={[
              "inline-flex max-w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border font-semibold transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/20",
              sizeClassNames[size],
              variantClassNames[variant],
              isActive
                ? "border-[#111827] bg-[#111827] text-white"
                : "border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111827]",
            ].join(" ")}
          >
            {Icon ? <Icon size={size === "sm" ? 14 : 16} aria-hidden /> : null}
            <span className="truncate">{item.label}</span>
            {typeof item.count === "number" ? (
              <span className={isActive ? "text-white/80" : "text-[#9ca3af]"}>{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
