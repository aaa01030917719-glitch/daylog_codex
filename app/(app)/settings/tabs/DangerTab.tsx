"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InviteLinkRow } from "../types";

interface DangerTabProps {
  workspaceName: string;
  inviteLinks: InviteLinkRow[];
  onError: (message: string | null) => void;
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "요청을 처리하지 못했습니다.";
  } catch {
    return "요청을 처리하지 못했습니다.";
  }
}

export function DangerTab({ workspaceName, inviteLinks, onError }: DangerTabProps) {
  const [resetAttendanceOpen, setResetAttendanceOpen] = useState(false);
  const [revokeInvitesOpen, setRevokeInvitesOpen] = useState(false);
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false);
  const [attendanceConfirm, setAttendanceConfirm] = useState("");
  const [workspaceConfirm, setWorkspaceConfirm] = useState("");
  const [agreeRevoke, setAgreeRevoke] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    null | "attendance" | "invite" | "workspace"
  >(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleAttendanceReset() {
    setLoadingAction("attendance");
    setSuccessMessage(null);
    onError(null);

    try {
      const response = await fetch("/api/settings/workspace?action=attendance-reset", {
        method: "DELETE",
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      setResetAttendanceOpen(false);
      setAttendanceConfirm("");
      setSuccessMessage("출퇴근 기록을 초기화했습니다.");
    } catch {
      onError("출퇴근 기록을 초기화하지 못했습니다.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleInviteRevoke() {
    setLoadingAction("invite");
    setSuccessMessage(null);
    onError(null);

    try {
      const response = await fetch("/api/settings/workspace?action=revoke-invites", {
        method: "DELETE",
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      setRevokeInvitesOpen(false);
      setAgreeRevoke(false);
      setSuccessMessage("모든 초대 링크를 무효화했습니다. 기본 초대 코드는 새 값으로 갱신됩니다.");
    } catch {
      onError("초대 링크를 무효화하지 못했습니다.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleWorkspaceDelete() {
    setLoadingAction("workspace");
    setSuccessMessage(null);
    onError(null);

    try {
      const response = await fetch("/api/workspace", { method: "DELETE" });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      window.location.href = "/onboarding";
    } catch {
      onError("워크스페이스를 삭제하지 못했습니다.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <>
      {successMessage ? (
        <div className="rounded-2xl border border-[#b7e4c7] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-2xl bg-[#b42318] px-4 py-3 text-sm leading-7 text-[#ffffff]">
        아래 작업은 즉시 적용되며 되돌릴 수 없습니다. 중요한 데이터는 먼저 내보내기나
        백업으로 확보해 주세요.
      </div>

      <section className="danger-zone">
        <div className="danger-zone__header">운영 데이터 정리</div>

        <div className="danger-zone__item">
          <div>
            <div className="danger-zone__item-title">출퇴근 기록 초기화</div>
            <div className="danger-zone__item-desc">
              현재 워크스페이스의 출퇴근 기록만 모두 삭제합니다. 멤버 계정과 프로젝트 데이터는
              유지됩니다.
            </div>
          </div>
          <button
            type="button"
            className="danger-button btn--sm"
            onClick={() => setResetAttendanceOpen(true)}
          >
            기록 초기화
          </button>
        </div>

        <div className="danger-zone__item">
          <div>
            <div className="danger-zone__item-title">모든 초대 링크 무효화</div>
            <div className="danger-zone__item-desc">
              현재 발급된 초대 링크 {inviteLinks.length}건과 기본 초대 코드를 모두 새 값으로 교체합니다.
            </div>
          </div>
          <button
            type="button"
            className="danger-button btn--sm"
            onClick={() => setRevokeInvitesOpen(true)}
          >
            전체 무효화
          </button>
        </div>
      </section>

      <section className="danger-zone">
        <div className="danger-zone__header">위험 구역</div>
        <div className="danger-zone__item">
          <div>
            <div className="danger-zone__item-title">워크스페이스 영구 삭제</div>
            <div className="danger-zone__item-desc">
              프로젝트, 일정, 문서, 공지, 아이디어, 메모, 출퇴근 기록까지 워크스페이스에 연결된
              데이터를 모두 삭제합니다.
            </div>
          </div>
          <button
            type="button"
            className="danger-button btn--sm"
            onClick={() => setDeleteWorkspaceOpen(true)}
          >
            워크스페이스 삭제
          </button>
        </div>
      </section>

      <Dialog open={resetAttendanceOpen} onOpenChange={setResetAttendanceOpen}>
        <DialogContent style={{ maxWidth: "32rem" }}>
          <DialogHeader>
            <div>
              <DialogTitle>출퇴근 기록 초기화</DialogTitle>
              <DialogDescription>
                아래 문구를 정확히 입력해야 실행할 수 있습니다.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="modal-body space-y-4">
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              확인을 위해 <strong>출퇴근 기록 초기화</strong>를 입력해 주세요.
            </p>
            <input
              value={attendanceConfirm}
              onChange={(event) => setAttendanceConfirm(event.target.value)}
              className="form-input"
              placeholder="출퇴근 기록 초기화"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setResetAttendanceOpen(false)}
              disabled={loadingAction === "attendance"}
            >
              취소
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleAttendanceReset}
              disabled={attendanceConfirm !== "출퇴근 기록 초기화" || loadingAction === "attendance"}
            >
              {loadingAction === "attendance" ? "처리 중..." : "초기화 실행"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeInvitesOpen} onOpenChange={setRevokeInvitesOpen}>
        <DialogContent style={{ maxWidth: "32rem" }}>
          <DialogHeader>
            <div>
              <DialogTitle>모든 초대 링크 무효화</DialogTitle>
              <DialogDescription>
                기존 링크는 더 이상 사용할 수 없고, 기본 초대 코드도 새 값으로 갱신됩니다.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="modal-body space-y-4">
            <label className="inline-flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={agreeRevoke}
                onChange={(event) => setAgreeRevoke(event.target.checked)}
              />
              안내 내용을 이해했고, 모든 초대 링크를 무효화합니다.
            </label>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setRevokeInvitesOpen(false)}
              disabled={loadingAction === "invite"}
            >
              취소
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleInviteRevoke}
              disabled={!agreeRevoke || loadingAction === "invite"}
            >
              {loadingAction === "invite" ? "처리 중..." : "전체 무효화"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteWorkspaceOpen} onOpenChange={setDeleteWorkspaceOpen}>
        <DialogContent style={{ maxWidth: "34rem" }}>
          <DialogHeader>
            <div>
              <DialogTitle>워크스페이스 삭제</DialogTitle>
              <DialogDescription>
                삭제 후에는 복구할 수 없습니다. 워크스페이스 이름을 정확히 입력해 주세요.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="modal-body space-y-4">
            <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] px-4 py-3 text-sm leading-7 text-[#b42318]">
              {workspaceName}에 연결된 프로젝트, 문서, 공지, 메모, 아이디어, 출퇴근 데이터가
              모두 삭제됩니다.
            </div>
            <input
              value={workspaceConfirm}
              onChange={(event) => setWorkspaceConfirm(event.target.value)}
              className="form-input"
              placeholder={workspaceName}
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setDeleteWorkspaceOpen(false)}
              disabled={loadingAction === "workspace"}
            >
              취소
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleWorkspaceDelete}
              disabled={workspaceConfirm !== workspaceName || loadingAction === "workspace"}
            >
              {loadingAction === "workspace" ? "삭제 중..." : "영구 삭제"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
