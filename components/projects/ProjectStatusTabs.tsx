"use client";

import type { ProjectBoardStatus } from "@/components/projects/project-board-types";
import { FilterChipGroup } from "@/components/ui/FilterChipGroup";

interface ProjectStatusTabsProps {
  activeStatus: ProjectBoardStatus;
  counts: Record<ProjectBoardStatus, number>;
  onChange: (status: ProjectBoardStatus) => void;
}

const STATUS_LABELS: Record<ProjectBoardStatus, string> = {
  ALL: "전체",
  ONGOING: "진행 중",
  REVIEW: "검토 중",
  COMPLETED: "완료",
  UPCOMING: "예정",
};

const STATUS_ITEMS = (Object.keys(STATUS_LABELS) as ProjectBoardStatus[]).map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

export function ProjectStatusTabs({
  activeStatus,
  counts,
  onChange,
}: ProjectStatusTabsProps) {
  return (
    <FilterChipGroup
      aria-label="프로젝트 상태 필터"
      items={STATUS_ITEMS.map((item) => ({ ...item, count: counts[item.value] }))}
      activeValue={activeStatus}
      onChange={onChange}
    />
  );
}
