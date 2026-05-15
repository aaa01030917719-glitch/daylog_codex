"use client";

import { FilterChipGroup } from "@/components/ui/FilterChipGroup";

type BoardStatus = "ALL" | "ONGOING" | "REVIEW" | "COMPLETED" | "UPCOMING";

interface ProjectFilterTabsProps {
  activeStatus: BoardStatus;
  counts: Record<BoardStatus, number>;
  onChange: (status: BoardStatus) => void;
}

const STATUS_TABS: Array<{ value: BoardStatus; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "ONGOING", label: "진행중" },
  { value: "REVIEW", label: "검토중" },
  { value: "COMPLETED", label: "완료" },
  { value: "UPCOMING", label: "예정" },
];

export function ProjectFilterTabs({
  activeStatus,
  counts,
  onChange,
}: ProjectFilterTabsProps) {
  return (
    <FilterChipGroup
      aria-label="프로젝트 업무 상태 필터"
      items={STATUS_TABS.map((tab) => ({
        ...tab,
        count: counts[tab.value],
      }))}
      activeValue={activeStatus}
      onChange={onChange}
      size="sm"
    />
  );
}
