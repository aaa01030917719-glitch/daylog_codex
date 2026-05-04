"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { buildProjectGanttPayload } from "@/components/projects/project-data-mappers";
import { ProjectStatusTabs } from "@/components/projects/ProjectStatusTabs";
import type {
  ProjectBoardStatus,
  ProjectGanttStatus,
  ProjectGanttRow,
  ProjectSummary,
} from "@/components/projects/project-board-types";
import styles from "@/components/projects/ProjectGanttViewRedesign.module.css";

interface ProjectGanttViewRedesignProps {
  projects: ProjectSummary[];
  onSelectProject?: (project: ProjectSummary) => void;
}

const DAY_WIDTH = 32;

const LEGEND_ITEMS: Array<{
  key: ProjectGanttStatus;
  label: string;
  color: string;
}> = [
  { key: "done", label: "완료", color: "#2A8C50" },
  { key: "prog", label: "진행 중", color: "#4f7cff" },
  { key: "review", label: "검토 중", color: "#f97316" },
  { key: "hold", label: "보류", color: "#8b5cf6" },
  { key: "todo", label: "예정", color: "#e5e7eb" },
];

function buildRange(rows: ProjectGanttRow[]) {
  const allDates = rows
    .flatMap((row) => [row.startDate, row.endDate])
    .filter((value): value is string => Boolean(value))
    .map((value) => startOfDay(parseISO(value)))
    .sort((left, right) => left.getTime() - right.getTime());

  const today = startOfDay(new Date());
  const minDate = allDates[0] ?? today;
  const maxDate = allDates[allDates.length - 1] ?? today;
  const start = subDays(minDate, 5);
  const end = addDays(maxDate, 5);
  const total = differenceInCalendarDays(end, start) + 1;

  return { start, total };
}

function buildDays(range: ReturnType<typeof buildRange>) {
  return Array.from({ length: range.total }, (_, index) => addDays(range.start, index));
}

function buildMonthMarkers(days: Date[]) {
  return days.reduce<Array<{ key: string; label: string; left: number }>>((acc, day, index) => {
    if (index === 0 || day.getDate() === 1) {
      acc.push({
        key: `${day.getFullYear()}-${day.getMonth() + 1}`,
        label: `${day.getMonth() + 1}월`,
        left: index * DAY_WIDTH + 4,
      });
    }

    return acc;
  }, []);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatTooltipDate(value?: string | null) {
  if (!value) {
    return "마감일 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "마감일 없음";
  }

  return format(date, "yyyy.MM.dd", { locale: ko });
}

export function ProjectGanttViewRedesign({
  projects,
  onSelectProject,
}: ProjectGanttViewRedesignProps) {
  const [activeFilter, setActiveFilter] = useState<ProjectBoardStatus>("ALL");
  const [tooltip, setTooltip] = useState<{
    row: ProjectGanttRow;
    x: number;
    y: number;
  } | null>(null);
  const leftListRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const payload = useMemo(() => buildProjectGanttPayload(projects), [projects]);
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  const baseRows = useMemo(() => {
    const rowsByProject = new Map<string, ProjectGanttRow[]>();

    for (const row of payload.rows) {
      const existing = rowsByProject.get(row.projectId) ?? [];
      existing.push(row);
      rowsByProject.set(row.projectId, existing);
    }

    return payload.items.flatMap((item) => {
      const projectRows = rowsByProject.get(item.id) ?? [];
      const taskRows = projectRows.filter((row) => row.type === "task");

      if (taskRows.length > 0) {
        return taskRows;
      }

      const groupRow = projectRows.find((row) => row.type === "group");
      return groupRow ? [groupRow] : [];
    });
  }, [payload.items, payload.rows]);

  const visibleRows = useMemo(() => {
    if (activeFilter === "ALL") {
      return baseRows;
    }

    return baseRows.filter((row) => row.boardStatus === activeFilter);
  }, [activeFilter, baseRows]);

  const counts = useMemo(
    () => ({
      ALL: projects.length,
      ONGOING: projects.filter((project) => project.boardStatus === "ONGOING").length,
      REVIEW: projects.filter((project) => project.boardStatus === "REVIEW").length,
      COMPLETED: projects.filter((project) => project.boardStatus === "COMPLETED").length,
      UPCOMING: projects.filter((project) => project.boardStatus === "UPCOMING").length,
    }),
    [projects]
  );

  const range = useMemo(() => buildRange(baseRows), [baseRows]);
  const days = useMemo(() => buildDays(range), [range]);
  const monthMarkers = useMemo(() => buildMonthMarkers(days), [days]);
  const totalWidth = days.length * DAY_WIDTH;
  const today = startOfDay(new Date());
  const todayIndex = differenceInCalendarDays(today, range.start);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!rightPaneRef.current || todayIndex < 0) {
        return;
      }

      rightPaneRef.current.scrollLeft = Math.max(0, (todayIndex - 3) * DAY_WIDTH);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [todayIndex]);

  function handleTimelineScroll() {
    if (!leftListRef.current || !rightPaneRef.current) {
      return;
    }

    leftListRef.current.scrollTop = rightPaneRef.current.scrollTop;
  }

  function handleProjectSelect(projectId: string) {
    const project = projectMap.get(projectId);
    if (!project || !onSelectProject) {
      return;
    }

    onSelectProject(project);
  }

  const openTooltip = useCallback((event: React.MouseEvent<HTMLElement>, row: ProjectGanttRow) => {
    const tooltipWidth = 240;
    const tooltipHeight = 110;
    const nextX = Math.min(event.clientX + 16, window.innerWidth - tooltipWidth - 12);
    const nextY = Math.min(event.clientY + 16, window.innerHeight - tooltipHeight - 12);

    setTooltip({
      row,
      x: Math.max(12, nextX),
      y: Math.max(12, nextY),
    });
  }, []);

  const closeTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className={styles.pageShell}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <ProjectStatusTabs
            activeStatus={activeFilter}
            counts={counts}
            onChange={setActiveFilter}
          />
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.legend}>
            {LEGEND_ITEMS.map((item) => (
              <div key={item.key} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: item.color }} />
                {item.label}
              </div>
            ))}
            <div className={styles.legendItem}>
              <span className={styles.todayLegendLine} />
              오늘
            </div>
          </div>
        </div>
      </div>

      <div className={styles.ganttArea}>
        <div className={styles.ganttLeft}>
          <div className={styles.ganttLeftHeader}>업무 / 담당자</div>
          <div ref={leftListRef} className={styles.taskList}>
            {visibleRows.length === 0 ? (
              <div className={styles.emptyState}>표시할 프로젝트가 없습니다.</div>
            ) : (
              visibleRows.map((row) => (
                <div key={row.id} className={styles.taskRow}>
                  <span className={styles.taskDot} style={{ background: row.color }} />
                  <button
                    type="button"
                    className={styles.taskNameButton}
                    onClick={() => handleProjectSelect(row.projectId)}
                    aria-label={`${row.title} 프로젝트 상세 보기`}
                    onMouseEnter={(event) => openTooltip(event, row)}
                    onMouseMove={(event) => openTooltip(event, row)}
                    onMouseLeave={closeTooltip}
                  >
                    <span className={styles.taskName}>{row.title}</span>
                  </button>
                  <div className={styles.taskAssignee}>
                    {(row.assigneeName ?? row.title).slice(0, 1)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          ref={rightPaneRef}
          className={styles.ganttRight}
          onScroll={handleTimelineScroll}
        >
          <div className={styles.ganttDateHeader}>
            <div className={styles.dateHeaderInner} style={{ width: totalWidth }}>
              {monthMarkers.map((marker) => (
                <div
                  key={marker.key}
                  className={styles.monthLabel}
                  style={{ left: marker.left }}
                >
                  {marker.label}
                </div>
              ))}

              <div className={styles.dayLabels}>
                {days.map((day) => {
                  const showLabel =
                    day.getDate() === 1 ||
                    day.getDate() === 5 ||
                    day.getDate() === 10 ||
                    day.getDate() === 15 ||
                    day.getDate() === 20 ||
                    day.getDate() === 25 ||
                    day.getDate() === 30 ||
                    isSameDay(day, today);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`${styles.dayLabel} ${
                        isSameDay(day, today) ? styles.dayLabelToday : ""
                      }`}
                      style={{ width: DAY_WIDTH }}
                    >
                      {showLabel ? day.getDate() : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className={styles.ganttBody}
            style={{ width: totalWidth, minHeight: `${visibleRows.length * 44}px` }}
          >
            {days.map((day, index) => (
              <div
                key={`grid-${day.toISOString()}`}
                className={`${styles.ganttGridLine} ${
                  day.getDay() === 1 ? styles.ganttGridLineWeek : ""
                }`}
                style={{ left: index * DAY_WIDTH }}
              />
            ))}

            {todayIndex >= 0 && todayIndex < days.length ? (
              <div
                className={styles.todayLine}
                style={{ left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
              >
                <div className={styles.todayDot} />
              </div>
            ) : null}

            {visibleRows.map((row, rowIndex) => {
              const startIndex = row.startDate
                ? differenceInCalendarDays(parseISO(row.startDate), range.start)
                : 0;
              const endIndex = row.endDate
                ? differenceInCalendarDays(parseISO(row.endDate), range.start)
                : startIndex;
              const clampedStart = Math.max(0, startIndex);
              const clampedEnd = Math.min(days.length - 1, endIndex);
              const left = clampedStart * DAY_WIDTH;
              const width = Math.max(
                DAY_WIDTH,
                (clampedEnd - clampedStart + 1) * DAY_WIDTH - 4
              );

              return (
                <div
                  key={row.id}
                  className={styles.ganttRow}
                  style={{ top: rowIndex * 44 }}
                >
                  <div
                    className={styles.barWrap}
                    style={{
                      left,
                      width,
                      background: `${row.color}22`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleProjectSelect(row.projectId);
                    }}
                    onMouseEnter={(event) => openTooltip(event, row)}
                    onMouseMove={(event) => openTooltip(event, row)}
                    onMouseLeave={closeTooltip}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleProjectSelect(row.projectId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${row.title} 프로젝트 상세 보기`}
                  >
                    <div
                      className={styles.barInner}
                      style={{
                        background: row.color,
                        opacity: row.status === "done" ? 0.6 : 1,
                      }}
                    >
                      <div className={styles.barText}>{width > 40 ? row.title : ""}</div>
                    </div>
                  </div>
                  <div
                    className={styles.milestoneDot}
                    style={{
                      left: (clampedEnd + 1) * DAY_WIDTH - 2,
                      background: row.color,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {tooltip ? (
        <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y }}>
          <div className={styles.tooltipTitle}>{tooltip.row.title}</div>
          <div className={styles.tooltipMeta}>
            <span className={styles.tooltipLabel}>마감일</span>
            <span>{formatTooltipDate(tooltip.row.endDate)}</span>
          </div>
          <div className={styles.tooltipMeta}>
            <span className={styles.tooltipLabel}>담당자</span>
            <span>
              {tooltip.row.assigneeName ||
                projectMap.get(tooltip.row.projectId)?.assigneeNames.join(", ") ||
                "담당자 미지정"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
