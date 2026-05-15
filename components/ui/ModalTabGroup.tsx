"use client";

import type { ReactNode } from "react";

export interface ModalTabItem<TValue extends string> {
  value: TValue;
  label: ReactNode;
  count?: number;
}

interface ModalTabGroupProps<TValue extends string> {
  items: Array<ModalTabItem<TValue>>;
  activeValue: TValue;
  onChange: (value: TValue) => void;
  "aria-label"?: string;
  className?: string;
}

export function ModalTabGroup<TValue extends string>({
  items,
  activeValue,
  onChange,
  "aria-label": ariaLabel,
  className,
}: ModalTabGroupProps<TValue>) {
  return (
    <div
      className={`flex max-w-full overflow-x-auto border-b border-[var(--border-light)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden${
        className ? ` ${className}` : ""
      }`}
      aria-label={ariaLabel}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = activeValue === item.value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={[
              "-mb-px inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-semibold transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/20",
              isActive
                ? "border-[#111827] text-[#111827]"
                : "border-transparent text-[#6b7280] hover:text-[#111827]",
            ].join(" ")}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span className={isActive ? "text-[#111827]" : "text-[#9ca3af]"}>{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
