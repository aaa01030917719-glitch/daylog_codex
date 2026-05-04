import { prisma } from "@/lib/prisma";

type ColumnRow = { column_name: string };

export interface TaskColumnSupport {
  startDate: boolean;
  isApprovalRequested: boolean;
  approvedBy: boolean;
  approvedAt: boolean;
  rejectedReason: boolean;
}

const EMPTY_TASK_COLUMN_SUPPORT: TaskColumnSupport = {
  startDate: false,
  isApprovalRequested: false,
  approvedBy: false,
  approvedAt: false,
  rejectedReason: false,
};

let taskColumnSupportPromise: Promise<TaskColumnSupport> | null = null;

export async function getTaskColumnSupport() {
  if (!taskColumnSupportPromise) {
    taskColumnSupportPromise = prisma
      .$queryRaw<ColumnRow[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Task'
          AND column_name IN ('startDate', 'isApprovalRequested', 'approvedBy', 'approvedAt', 'rejectedReason')
      `
      .then((rows) => {
        const columns = new Set(rows.map((row) => row.column_name));

        return {
          startDate: columns.has("startDate"),
          isApprovalRequested: columns.has("isApprovalRequested"),
          approvedBy: columns.has("approvedBy"),
          approvedAt: columns.has("approvedAt"),
          rejectedReason: columns.has("rejectedReason"),
        } satisfies TaskColumnSupport;
      })
      .catch(() => EMPTY_TASK_COLUMN_SUPPORT);
  }

  return taskColumnSupportPromise;
}

