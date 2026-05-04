"use client";

import { CalendarDays, ChartNoAxesGantt, LayoutList } from "lucide-react";
import type { ProjectViewMode } from "@/components/projects/project-board-types";

interface ProjectViewToggleProps {
  viewMode: ProjectViewMode;
  onChange: (view: ProjectViewMode) => void;
}

const VIEWS: { value: ProjectViewMode; label: string; icon: React.ElementType }[] = [
  { value: "LIST", label: "목록", icon: LayoutList },
  { value: "CALENDAR", label: "달력", icon: CalendarDays },
  { value: "GANTT", label: "간트", icon: ChartNoAxesGantt },
];

export function ProjectViewToggle({
  viewMode,
  onChange,
}: ProjectViewToggleProps) {
  return (
    <div className="view-toggle">
      {VIEWS.map(({ value, label, icon: Icon }) => {
        const isActive = viewMode === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`view-chip ${isActive ? "is-active" : ""}`}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
