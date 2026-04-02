"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProjectSummary } from "@/components/projects/project-board-types";

interface ProjectCalendarViewProps {
  projects: ProjectSummary[];
}

function withinRange(date: Date, project: ProjectSummary) {
  const start = new Date(project.startDate ?? project.createdAt);
  const end = new Date(project.endDate ?? project.startDate ?? project.createdAt);
  const current = date.getTime();

  return current >= start.getTime() && current <= end.getTime();
}

export function ProjectCalendarView({ projects }: ProjectCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  return (
    <section className="card-panel p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {format(currentMonth, "yyyy년 M월", { locale: ko })}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            프로젝트 일정과 시작일, 마감일을 달력 단위로 정리해 보여드립니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentMonth((value) => subMonths(value, 1))} className="icon-button">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => setCurrentMonth((value) => addMonths(value, 1))} className="icon-button">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--text-muted)]">
        {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
        {monthDays.map((day) => {
          const matchedProjects = projects.filter((project) => withinRange(day, project));
          const visibleProjects = matchedProjects.slice(0, 3);
          const muted = !isSameMonth(day, currentMonth);

          return (
            <div key={day.toISOString()} className="min-h-[152px] rounded-[18px] border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className={`text-sm font-semibold ${muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                {format(day, "d")}
              </div>

              <div className="mt-3 space-y-2">
                {visibleProjects.map((project) => (
                  <div
                    key={`${project.id}-${day.toISOString()}`}
                    className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-2.5 py-2 text-left text-xs text-[var(--text-secondary)]"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: project.color }} />
                    <span className="truncate">{project.name}</span>
                  </div>
                ))}

                {matchedProjects.length > 3 ? (
                  <div className="px-1 text-xs font-medium text-[var(--text-muted)]">
                    +{matchedProjects.length - 3}개 더 보기
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
