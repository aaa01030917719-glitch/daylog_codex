"use client";

import { FilterChipGroup } from "@/components/ui/FilterChipGroup";
import type { LucideIcon } from "lucide-react";
import { ChartNoAxesGantt, Grid2X2, LayoutList } from "lucide-react";

type ProjectTaskViewMode = "CARD" | "LIST" | "CALENDAR" | "GANTT";

interface ProjectTaskHeaderProps {
  viewMode: ProjectTaskViewMode;
  onViewChange: (viewMode: ProjectTaskViewMode) => void;
}

const VIEW_OPTIONS: Array<{ value: ProjectTaskViewMode; label: string; icon: LucideIcon }> = [
  { value: "CARD", label: "카드", icon: Grid2X2 },
  { value: "LIST", label: "목록", icon: LayoutList },
  { value: "GANTT", label: "간트", icon: ChartNoAxesGantt },
];

export function ProjectTaskHeader({
  viewMode,
  onViewChange,
}: ProjectTaskHeaderProps) {
  return (
    <FilterChipGroup
      aria-label="프로젝트 업무 보기 전환"
      items={VIEW_OPTIONS}
      activeValue={viewMode}
      onChange={onViewChange}
      size="sm"
      variant="view"
    />
  );
}
