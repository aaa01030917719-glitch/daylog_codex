"use client";

import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ArrowLeft, Plus } from "lucide-react";
import { TaskDetail } from "./TaskDetail";
import { TaskCreateDetailModal } from "./TaskCreateDetailModal";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  requiresApproval: boolean;
  isApprovalRequested?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | Date | null;
  rejectedReason?: string | null;
  budget: number | null;
  dueDate: string | Date | null;
  progress?: number | null;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  assignee: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null };
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Project {
  id: string;
  name: string;
  color: string;
  status: string;
}

interface Props {
  project: Project;
  initialTasks: Task[];
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
  showHeader?: boolean;
  initialSelectedTaskId?: string | null;
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "예정" },
  { id: "IN_PROGRESS", label: "진행 중" },
  { id: "IN_REVIEW", label: "검토 중" },
  { id: "DONE", label: "완료" },
];

const PRIORITY_STYLES: Record<Priority, { bg: string; text: string; label: string }> = {
  LOW: { bg: "#F0F0F0", text: "#777", label: "낮음" },
  MEDIUM: { bg: "#E8F7EE", text: "var(--success)", label: "중간" },
  HIGH: { bg: "#FFF8E6", text: "#D4A200", label: "높음" },
  URGENT: { bg: "#FDECEA", text: "#D93025", label: "긴급" },
};

export function KanbanBoard({ project, initialTasks, members, isAdmin, currentUserId, showHeader = true, initialSelectedTaskId = null }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createForStatus, setCreateForStatus] = useState<TaskStatus | null>(null);

  useEffect(() => {
    if (!initialSelectedTaskId) return;
    const task = tasks.find((item) => item.id === initialSelectedTaskId);
    if (task) setSelectedTask(task);
  }, [initialSelectedTaskId, tasks]);

  const tasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const nextProgress =
      newStatus === "DONE"
        ? 100
        : task.status === "DONE"
          ? Math.min(task.progress ?? 0, 99)
          : task.progress;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, progress: nextProgress } : t
      )
    );

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, progress: nextProgress }),
      });
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: task.status, progress: task.progress } : t
        )
      );
    }
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  }

  function handleTaskCreated(task: Task) {
    setTasks((prev) => [...prev, task]);
    setCreateForStatus(null);
  }

  return (
    <div style={{ height: "100%" }}>
      {showHeader ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
          <button
            onClick={() => {
              window.location.href = "/projects";
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-body)", padding: "0.25rem", display: "flex", alignItems: "center" }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", background: project.color }} />
          <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-title)" }}>
            {project.name}
          </h1>
        </div>
      ) : null}

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: "0.875rem", overflowX: "auto", paddingBottom: "0.75rem", minHeight: "64vh" }}>
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.id);
            return (
              <div
                key={col.id}
                style={{
                  flexShrink: 0,
                  width: "16rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    background: "var(--table-header)",
                    borderRadius: "0.5rem 0.5rem 0 0",
                    padding: "0.5rem 0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-body)" }}>
                    {col.label}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-sub)", background: "#fff", borderRadius: "9999px", padding: "0.125rem 0.5rem" }}>
                    {colTasks.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex: 1,
                        background: snapshot.isDraggingOver ? "var(--accent-light)" : "var(--bg-light)",
                        borderRadius: "0 0 0.5rem 0.5rem",
                        border: "1px solid var(--border)",
                        borderTop: "none",
                        padding: "0.4375rem",
                        minHeight: "8rem",
                        transition: "background 0.15s",
                      }}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedTask(task)}
                              style={{
                                ...provided.draggableProps.style,
                                background: "#fff",
                                borderRadius: "0.5rem",
                                padding: "0.625rem",
                                marginBottom: "0.4375rem",
                                border: "1px solid var(--border)",
                                boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
                                cursor: "pointer",
                              }}
                            >
                              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-title)", marginBottom: "0.375rem", lineHeight: 1.32 }}>
                                {task.title}
                              </p>

                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.25rem" }}>
                                <span
                                  style={{
                                    fontSize: "0.6875rem",
                                    fontWeight: 600,
                                    padding: "0.125rem 0.375rem",
                                    borderRadius: "9999px",
                                    background: PRIORITY_STYLES[task.priority].bg,
                                    color: PRIORITY_STYLES[task.priority].text,
                                  }}
                                >
                                  {PRIORITY_STYLES[task.priority].label}
                                </span>

                                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                                  {task.dueDate && (
                                    <span style={{ fontSize: "0.6875rem", color: "var(--text-sub)" }}>
                                      {format(new Date(task.dueDate), "M/d", { locale: ko })}
                                    </span>
                                  )}
                                  {task.assignee && (
                                    <div
                                      style={{
                                        width: "1.25rem",
                                        height: "1.25rem",
                                        borderRadius: "50%",
                                        background: "var(--accent)",
                                        color: "#fff",
                                        fontSize: "0.625rem",
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {task.assignee.name?.charAt(0) ?? "?"}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Add task button */}
                      <button
                        onClick={() => setCreateForStatus(col.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.4375rem 0.5rem",
                          border: "1px dashed var(--border)",
                          borderRadius: "0.5rem",
                          background: "transparent",
                          color: "var(--text-sub)",
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                          marginTop: "0.125rem",
                        }}
                      >
                        <Plus size={14} />
                        태스크 추가
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          projectName={project.name}
          members={members}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      {/* Task create modal */}
      {createForStatus && (
        <TaskCreateDetailModal
          projectId={project.id}
          projectName={project.name}
          defaultStatus={createForStatus}
          members={members}
          currentUserId={currentUserId}
          onCreated={handleTaskCreated}
          onClose={() => setCreateForStatus(null)}
        />
      )}
    </div>
  );
}
