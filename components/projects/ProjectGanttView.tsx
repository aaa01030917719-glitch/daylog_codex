"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isWeekend,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { buildProjectGanttPayload } from "@/components/projects/project-data-mappers";
import type {
  ProjectGanttRow,
  ProjectGanttStatus,
  ProjectSummary,
} from "@/components/projects/project-board-types";
import styles from "@/components/projects/ProjectGanttView.module.css";

interface ProjectGanttViewProps {
  projects: ProjectSummary[];
}

type FilterKey = "all" | ProjectGanttStatus;

interface ProjectRowGroup {
  projectId: string;
  group: ProjectGanttRow;
  tasks: ProjectGanttRow[];
}

const DAY_WIDTH = 32;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "전체" },
  { key: "prog", label: "진행중" },
  { key: "review", label: "검수중" },
  { key: "todo", label: "예정" },
  { key: "done", label: "완료" },
  { key: "hold", label: "대기" },
];

const LEGEND_ITEMS: Array<{ key: ProjectGanttStatus; label: string }> = [
  { key: "done", label: "완료" },
  { key: "prog", label: "진행중" },
  { key: "review", label: "검수중" },
  { key: "hold", label: "대기" },
  { key: "todo", label: "예정" },
];

const STATUS_META: Record<
  ProjectGanttStatus,
  { badgeClassName: string; barClassName: string; label: string }
> = {
  done: {
    badgeClassName: styles.badgeDone,
    barClassName: styles.barDone,
    label: "완료",
  },
  prog: {
    badgeClassName: styles.badgeProg,
    barClassName: styles.barProg,
    label: "진행중",
  },
  review: {
    badgeClassName: styles.badgeReview,
    barClassName: styles.barReview,
    label: "검수중",
  },
  hold: {
    badgeClassName: styles.badgeHold,
    barClassName: styles.barHold,
    label: "대기",
  },
  todo: {
    badgeClassName: styles.badgeTodo,
    barClassName: styles.barTodo,
    label: "예정",
  },
};

function groupRows(rows: ProjectGanttRow[]) {
  const grouped = new Map<string, ProjectRowGroup>();

  for (const row of rows) {
    const existing = grouped.get(row.projectId);
    if (!existing) {
      grouped.set(row.projectId, {
        projectId: row.projectId,
        group: row.type === "group" ? row : { ...row, type: "group" },
        tasks: row.type === "task" ? [row] : [],
      });
      continue;
    }

    if (row.type === "group") {
      existing.group = row;
    } else {
      existing.tasks.push(row);
    }
  }

  return Array.from(grouped.values());
}

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

  return { start, end, total };
}

function buildHeaderDays(range: ReturnType<typeof buildRange>) {
  const monthCells: Array<{ key: string; label: string; width: number }> = [];
  const dayCells: Array<{ key: string; label: string; isToday: boolean; isWeekend: boolean }> = [];
  const today = format(new Date(), "yyyy-MM-dd");

  let currentMonthKey: string | null = null;
  let currentMonthCount = 0;

  for (let index = 0; index < range.total; index += 1) {
    const date = addDays(range.start, index);
    const iso = format(date, "yyyy-MM-dd");
    const monthKey = format(date, "yyyy-MM");

    dayCells.push({
      key: iso,
      label: date.getDate() === 1 || date.getDate() % 5 === 0 ? String(date.getDate()) : "",
      isToday: iso === today,
      isWeekend: isWeekend(date),
    });

    if (monthKey !== currentMonthKey) {
      if (currentMonthKey) {
        const monthDate = parseISO(`${currentMonthKey}-01`);
        monthCells.push({
          key: currentMonthKey,
          label: `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`,
          width: currentMonthCount * DAY_WIDTH,
        });
      }

      currentMonthKey = monthKey;
      currentMonthCount = 0;
    }

    currentMonthCount += 1;
  }

  if (currentMonthKey) {
    const monthDate = parseISO(`${currentMonthKey}-01`);
    monthCells.push({
      key: currentMonthKey,
      label: `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`,
      width: currentMonthCount * DAY_WIDTH,
    });
  }

  return { monthCells, dayCells };
}

function buildTooltip(row: ProjectGanttRow) {
  if (!row.startDate || !row.endDate) {
    return row.title;
  }

  return `${row.title}  ${format(parseISO(row.startDate), "M/d", { locale: ko })} ~ ${format(
    parseISO(row.endDate),
    "M/d",
    { locale: ko }
  )}`;
}

export function ProjectGanttView({ projects }: ProjectGanttViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const payload = useMemo(() => buildProjectGanttPayload(projects), [projects]);
  const groupedRows = useMemo(() => groupRows(payload.rows), [payload.rows]);
  const visibleGroups = useMemo(() => {
    if (activeFilter === "all") {
      return groupedRows;
    }

    return groupedRows
      .map((group) => {
        const filteredTasks = group.tasks.filter((task) => task.status === activeFilter);
        const includeGroup = group.group.status === activeFilter || filteredTasks.length > 0;

        if (!includeGroup) {
          return null;
        }

        return {
          ...group,
          tasks: filteredTasks,
        };
      })
      .filter((value): value is ProjectRowGroup => Boolean(value));
  }, [activeFilter, groupedRows]);
  const range = useMemo(() => buildRange(payload.rows), [payload.rows]);
  const { monthCells, dayCells } = useMemo(() => buildHeaderDays(range), [range]);
  const totalWidth = range.total * DAY_WIDTH;
  const todayOffset = differenceInCalendarDays(startOfDay(new Date()), range.start);
  const taskRows = useMemo(
    () => payload.rows.filter((row) => row.type === "task"),
    [payload.rows]
  );
  const footerStats = useMemo(() => {
    const total = taskRows.length;
    const done = taskRows.filter((row) => row.status === "done").length;
    const prog = taskRows.filter((row) => row.status === "prog").length;
    const hold = taskRows.filter((row) => row.status === "hold").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, prog, hold, progress };
  }, [taskRows]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!scrollRef.current || todayOffset < 0) {
        return;
      }

      scrollRef.current.scrollTo({
        left: Math.max(0, todayOffset * DAY_WIDTH - 280),
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [todayOffset, totalWidth]);

  return (
    <div className={styles.pageShell}>
      <div className={styles.filterBar}>
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;

          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              aria-pressed={isActive}
              className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ""}`}
            >
              {filter.label}
            </button>
          );
        })}

        <div className={styles.filterSep} />

        <div className={styles.legend}>
          {LEGEND_ITEMS.map((item) => (
            <div key={item.key} className={styles.legendItem}>
              <div
                className={`${styles.legendDot} ${
                  styles[`legendDot${item.key[0].toUpperCase()}${item.key.slice(1)}`]
                }`}
              />
              {item.label}
            </div>
          ))}
          <div className={styles.legendItem} style={{ marginLeft: 4, gap: 5 }}>
            <div className={styles.todayLegendLine} />
            오늘
          </div>
        </div>
      </div>

      <div className={styles.ganttWrap}>
        <div ref={scrollRef} className={styles.ganttScroll}>
          <div
            className={styles.ganttTable}
            style={{ minWidth: `${Math.max(960, 36 + 260 + totalWidth)}px` }}
          >
            <div className={styles.ganttHeader}>
              <div className={`${styles.ganttHeaderCell} ${styles.ghCheck}`} />
              <div className={`${styles.ganttHeaderCell} ${styles.ghTask}`}>업무명 / 담당자</div>
              <div className={styles.ganttDates} style={{ width: totalWidth }}>
                <div className={styles.dateMonthRow}>
                  {monthCells.map((cell) => (
                    <div
                      key={cell.key}
                      className={styles.dateMonthCell}
                      style={{ width: cell.width }}
                    >
                      {cell.label}
                    </div>
                  ))}
                </div>
                <div className={styles.dateDayRow}>
                  {dayCells.map((cell) => (
                    <div
                      key={cell.key}
                      className={`${styles.dateDayCell} ${
                        cell.isToday ? styles.dateDayToday : ""
                      } ${cell.isWeekend ? styles.dateDayWeekend : ""}`}
                      style={{ width: DAY_WIDTH }}
                    >
                      {cell.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {visibleGroups.length === 0 ? (
              <div className={styles.ganttEmpty}>표시할 업무가 없습니다.</div>
            ) : (
              visibleGroups.flatMap((group) => {
                const rows = [group.group, ...group.tasks];

                return rows.map((row) => {
                  const offsetDays = row.startDate
                    ? differenceInCalendarDays(parseISO(row.startDate), range.start)
                    : 0;
                  const spanDays =
                    row.startDate && row.endDate
                      ? differenceInCalendarDays(parseISO(row.endDate), parseISO(row.startDate)) +
                        1
                      : 1;
                  const statusMeta = STATUS_META[row.status];
                  const isGroup = row.type === "group";
                  const isDone = row.status === "done";
                  const width = Math.max(spanDays * DAY_WIDTH - 2, 8);

                  return (
                    <div
                      key={row.id}
                      className={`${styles.ganttRow} ${isGroup ? styles.ganttGroup : ""} ${
                        isDone ? styles.isDone : ""
                      }`}
                    >
                      <div className={styles.grCheck}>
                        {isGroup ? null : <input type="checkbox" checked={isDone} readOnly />}
                      </div>
                      <div className={styles.grInfo}>
                        <div className={styles.grInfoTop}>
                          <span className={styles.taskName}>{row.title}</span>
                          {!isGroup ? (
                            <span className={`${styles.badge} ${statusMeta.badgeClassName}`}>
                              {statusMeta.label}
                            </span>
                          ) : null}
                        </div>
                        {!isGroup ? (
                          <div className={styles.grInfoSub}>
                            <span className={styles.assignee}>{row.assigneeName ?? ""}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className={styles.grTimeline} style={{ width: totalWidth }}>
                        {todayOffset >= 0 && todayOffset <= range.total ? (
                          <div
                            className={styles.todayLine}
                            style={{ left: todayOffset * DAY_WIDTH }}
                          />
                        ) : null}
                        {row.startDate && row.endDate ? (
                          <div
                            className={`${styles.ganttBar} ${statusMeta.barClassName}`}
                            style={{
                              left: offsetDays * DAY_WIDTH,
                              width,
                              background: isGroup ? row.color : undefined,
                            }}
                            data-tip={buildTooltip(row)}
                          >
                            {!isGroup && width > 60 ? row.title : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                });
              })
            )}
          </div>
        </div>

        <div className={styles.ganttFooter}>
          <div className={styles.ganttFooterStat}>
            전체 <strong>{footerStats.total}건</strong>
          </div>
          <div className={styles.ganttFooterStat}>
            완료 <strong>{footerStats.done}</strong>
          </div>
          <div className={styles.ganttFooterStat}>
            진행중 <strong>{footerStats.prog}</strong>
          </div>
          <div className={styles.ganttFooterStat}>
            대기 <strong>{footerStats.hold}</strong>
          </div>
          <div className={styles.ganttFooterStat} style={{ marginLeft: "auto" }}>
            진행률
            <div className={styles.progressMini}>
              <div
                className={styles.progressMiniFill}
                style={{ width: `${footerStats.progress}%` }}
              />
            </div>
            <strong>{footerStats.progress}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
