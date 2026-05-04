"use client";

import { TaskDetailModal } from "@/components/modals/TaskDetailModal";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  requiresApproval: boolean;
  budget: number | null;
  dueDate: string | Date | null;
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

interface Props {
  task: Task;
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDeleted: (taskId: string) => void;
  projectName?: string;
}

export function TaskDetail({
  task,
  members,
  isAdmin,
  currentUserId,
  onClose,
  onUpdated,
  onDeleted,
  projectName,
}: Props) {
  return (
    <TaskDetailModal
      isOpen
      onClose={onClose}
      taskId={task.id}
      projectName={projectName}
      initialTask={task}
      members={members}
      isAdmin={isAdmin}
      currentUserId={currentUserId}
      onUpdated={(updatedTask) =>
        onUpdated({
          ...updatedTask,
          creator: updatedTask.creator
            ? { id: updatedTask.creator.id, name: updatedTask.creator.name }
            : task.creator,
        })
      }
      onDeleted={onDeleted}
    />
  );
}
