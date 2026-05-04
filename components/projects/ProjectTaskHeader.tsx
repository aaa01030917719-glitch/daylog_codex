"use client";

import type { ElementType } from "react";
import { ChartNoAxesGantt, Grid2X2, LayoutList } from "lucide-react";

type ProjectTaskViewMode = "CARD" | "LIST" | "CALENDAR" | "GANTT";

interface ProjectTaskHeaderProps {
  viewMode: ProjectTaskViewMode;
  onViewChange: (viewMode: ProjectTaskViewMode) => void;
}

const VIEW_OPTIONS: Array<{ value: ProjectTaskViewMode; label: string; icon: ElementType }> = [
  { value: "CARD", label: "카드", icon: Grid2X2 },
  { value: "LIST", label: "목록", icon: LayoutList },
  { value: "GANTT", label: "간트", icon: ChartNoAxesGantt },
];

export function ProjectTaskHeader({
  viewMode,
  onViewChange,
}: ProjectTaskHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-1">
        {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = viewMode === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => onViewChange(value)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-[8px] border px-[10px] text-[12px] font-medium transition ${
                isActive
                  ? "border-[#c7d7ff] bg-[#eef2ff] text-[#3d6aee]"
                  : "border-[var(--border)] bg-white text-[#6b7280] hover:border-[#c7d7ff] hover:text-[#3d6aee]"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
