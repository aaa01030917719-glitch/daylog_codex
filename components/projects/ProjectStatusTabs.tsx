"use client";

import type { ProjectBoardStatus } from "@/components/projects/project-board-types";

interface ProjectStatusTabsProps {
  activeStatus: ProjectBoardStatus;
  counts: Record<ProjectBoardStatus, number>;
  onChange: (status: ProjectBoardStatus) => void;
}

const STATUS_LABELS: Record<ProjectBoardStatus, string> = {
  ALL: "전체",
  ONGOING: "진행 중",
  COMPLETED: "완료",
  UPCOMING: "예정",
};

export function ProjectStatusTabs({
  activeStatus,
  counts,
  onChange,
}: ProjectStatusTabsProps) {
  return (
    <div className="pill-group">
      {(Object.keys(STATUS_LABELS) as ProjectBoardStatus[]).map((status) => {
        const isActive = activeStatus === status;

        return (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            className={`pill-tab ${isActive ? "is-active" : ""}`}
          >
            {STATUS_LABELS[status]} {counts[status]}
          </button>
        );
      })}
    </div>
  );
}
