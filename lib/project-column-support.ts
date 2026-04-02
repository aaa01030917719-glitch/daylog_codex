import { prisma } from "@/lib/prisma";

type ColumnRow = { column_name: string };

export interface ProjectColumnSupport {
  subtitle: boolean;
  progress: boolean;
  startDate: boolean;
  endDate: boolean;
}

let projectColumnSupportPromise: Promise<ProjectColumnSupport> | null = null;

const EMPTY_PROJECT_COLUMN_SUPPORT: ProjectColumnSupport = {
  subtitle: false,
  progress: false,
  startDate: false,
  endDate: false,
};

export async function getProjectColumnSupport() {
  if (!projectColumnSupportPromise) {
    projectColumnSupportPromise = prisma
      .$queryRaw<ColumnRow[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Project'
          AND column_name IN ('subtitle', 'progress', 'startDate', 'endDate')
      `
      .then((rows) => {
        const columns = new Set(rows.map((row) => row.column_name));

        return {
          subtitle: columns.has("subtitle"),
          progress: columns.has("progress"),
          startDate: columns.has("startDate"),
          endDate: columns.has("endDate"),
        } satisfies ProjectColumnSupport;
      })
      .catch(() => EMPTY_PROJECT_COLUMN_SUPPORT);
  }

  return projectColumnSupportPromise;
}

export async function hasProjectSubtitleColumn() {
  return (await getProjectColumnSupport()).subtitle;
}

function normalizeProjectColumnSupport(
  input: boolean | ProjectColumnSupport
): ProjectColumnSupport {
  if (typeof input === "boolean") {
    return {
      ...EMPTY_PROJECT_COLUMN_SUPPORT,
      subtitle: input,
    };
  }

  return input;
}

export function getProjectBaseSelect(includeColumns: boolean | ProjectColumnSupport) {
  const columnSupport = normalizeProjectColumnSupport(includeColumns);

  return {
    id: true,
    name: true,
    ...(columnSupport.subtitle ? { subtitle: true } : {}),
    description: true,
    color: true,
    status: true,
    budget: true,
    ...(columnSupport.progress ? { progress: true } : {}),
    ...(columnSupport.startDate ? { startDate: true } : {}),
    ...(columnSupport.endDate ? { endDate: true } : {}),
    createdAt: true,
    workspaceId: true,
  } as const;
}
