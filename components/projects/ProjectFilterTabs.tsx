"use client";

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
    <div className="flex flex-wrap items-center gap-1.5">
      {STATUS_TABS.map((tab) => {
        const isActive = activeStatus === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-[11px] py-1 text-[11px] font-medium transition ${
              isActive
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-white text-[#6b7280] hover:border-[#c7d7ff] hover:text-[#3d6aee]"
            }`}
          >
            <span>{tab.label}</span>
            <span className="font-semibold opacity-90">{counts[tab.value]}</span>
          </button>
        );
      })}
    </div>
  );
}
