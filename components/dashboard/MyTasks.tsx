import { format, differenceInCalendarDays } from "date-fns";
import { ko } from "date-fns/locale";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  assigneeName: string | null;
  dueDate: Date | null;
}

interface MyTasksProps {
  tasks: TaskRow[];
}

const STATUS_STYLES: Record<TaskStatus, { bg: string; color: string; label: string }> = {
  TODO:        { bg: "#F0F0F0", color: "#888888", label: "대기" },
  IN_PROGRESS: { bg: "var(--accent-light)", color: "var(--accent)", label: "진행중" },
  IN_REVIEW:   { bg: "#FFF8E6", color: "#D4A200", label: "검토중" },
  DONE:        { bg: "#E8F7EE", color: "var(--success)", label: "완료" },
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "낮음", MEDIUM: "보통", HIGH: "높음", URGENT: "긴급",
};

function DueCell({ dueDate }: { dueDate: Date | null }) {
  if (!dueDate) return <span style={{ color: "var(--text-sub)" }}>-</span>;
  const diff = differenceInCalendarDays(new Date(dueDate), new Date());
  const isUrgent = diff <= 1;
  return (
    <span style={{ color: isUrgent ? "var(--accent)" : "var(--text-body)", fontWeight: isUrgent ? 600 : 400 }}>
      {format(new Date(dueDate), "M/d", { locale: ko })}
      {isUrgent && diff >= 0 && <span className="ml-1 text-xs">D-{diff}</span>}
      {diff < 0 && <span className="ml-1 text-xs">만료</span>}
    </span>
  );
}

export function MyTasks({ tasks }: MyTasksProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6" style={{ border: "1px solid var(--border)" }}>
        <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--text-title)" }}>내 프로젝트</h2>
        <p className="text-sm text-center py-8" style={{ color: "var(--text-sub)" }}>배정된 프로젝트가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-6 py-4">
        <h2 className="font-serif text-lg font-semibold" style={{ color: "var(--text-title)" }}>내 프로젝트</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--table-header)" }}>
              <th className="px-4 py-2.5 text-left font-medium" style={{ color: "var(--text-sub-title)" }}>프로젝트명</th>
              <th className="px-4 py-2.5 text-left font-medium" style={{ color: "var(--text-sub-title)" }}>상태</th>
              <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell" style={{ color: "var(--text-sub-title)" }}>우선순위</th>
              <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell" style={{ color: "var(--text-sub-title)" }}>담당자</th>
              <th className="px-4 py-2.5 text-left font-medium" style={{ color: "var(--text-sub-title)" }}>마감일</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => {
              const s = STATUS_STYLES[task.status];
              return (
                <tr
                  key={task.id}
                  style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}
                  className="hover:bg-[var(--bg-light)] transition-colors"
                >
                  <td className="px-4 py-3 font-medium max-w-xs truncate" style={{ color: "var(--text-title)" }}>
                    {task.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "var(--text-body)" }}>
                    {PRIORITY_LABELS[task.priority]}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "var(--text-body)" }}>
                    {task.assigneeName ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <DueCell dueDate={task.dueDate} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
