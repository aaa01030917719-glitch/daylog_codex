"use client";

import { CalendarDays, ChartNoAxesGantt, LayoutList, type LucideIcon } from "lucide-react";
import type { ProjectViewMode } from "@/components/projects/project-board-types";
import { FilterChipGroup } from "@/components/ui/FilterChipGroup";

interface ProjectViewToggleProps {
  viewMode: ProjectViewMode;
  onChange: (view: ProjectViewMode) => void;
}

const VIEWS: {
  value: ProjectViewMode;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "LIST", label: "목록", icon: LayoutList },
  { value: "CALENDAR", label: "달력", icon: CalendarDays },
  { value: "GANTT", label: "간트", icon: ChartNoAxesGantt },
];

export function ProjectViewToggle({
  viewMode,
  onChange,
}: ProjectViewToggleProps) {
  return (
    <FilterChipGroup
      aria-label="프로젝트 보기 전환"
      items={VIEWS}
      activeValue={viewMode}
      onChange={onChange}
      variant="view"
    />
  );
}
