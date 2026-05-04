import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CommentPanel } from "@/components/comments/CommentPanel";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

const BADGE_MAP = {
  SCHEDULE: { label: "일정", className: "status-badge status-badge--accent" },
  FACILITY: { label: "시설", className: "status-badge status-badge--success" },
  NOTICE: { label: "공지", className: "status-badge status-badge--warning" },
  WORK: { label: "업무", className: "status-badge status-badge--purple" },
  OTHER: { label: "기타", className: "status-badge status-badge--neutral" },
} as const;

export default async function NoticeDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  if (!workspaceId) {
    notFound();
  }

  const notice = await prisma.notice.findFirst({
    where: {
      id: params.id,
      workspaceId,
    },
    include: {
      author: {
        select: { name: true },
      },
    },
  });

  if (!notice) {
    notFound();
  }

  const badge = BADGE_MAP[notice.badge];

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">Notice Detail</div>
          <h1 className="page-title">공지사항 상세</h1>
          <p className="page-subtitle">
            공지 본문과 관련된 대화를 같은 화면에서 함께 확인할 수 있습니다.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/notices" className="secondary-button">
            목록으로
          </Link>
        </div>
      </section>

      <section className="card-panel">
        <div className="card-header">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={badge.className}>{badge.label}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {format(new Date(notice.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
              </span>
            </div>
            <h2 className="card-title text-xl">{notice.title}</h2>
            <p className="card-description">
              작성자 {notice.author.name ?? "이름 없음"} · 공지 기간{" "}
              {format(new Date(notice.startDate), "yyyy.MM.dd", { locale: ko })} -{" "}
              {format(new Date(notice.endDate), "yyyy.MM.dd", { locale: ko })}
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--surface-2)] p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
              {notice.content}
            </p>
          </div>
        </div>
      </section>

      <CommentPanel targetType="notice" targetId={notice.id} title="댓글" />
    </div>
  );
}
