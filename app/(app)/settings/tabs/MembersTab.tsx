"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InviteLinkRow, MemberRoleValue, WorkspaceMemberRow } from "../types";
import { createInviteUrl as buildInviteUrl } from "@/lib/utils";

interface MembersTabProps {
  members: WorkspaceMemberRow[];
  inviteLinks: InviteLinkRow[];
  onMembersUpdate: (members: WorkspaceMemberRow[]) => void;
  onLinksUpdate: (links: InviteLinkRow[]) => void;
  onError: (message: string | null) => void;
}

type InviteFormState = {
  role: "ADMIN" | "MEMBER";
  expireDays: "1" | "7" | "30" | "0";
  memo: string;
};

function getRoleBadgeClass(role: MemberRoleValue) {
  if (role === "OWNER") return "status-badge status-badge--accent";
  if (role === "ADMIN") return "status-badge status-badge--warning";
  return "status-badge status-badge--neutral";
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "요청을 처리하지 못했습니다.";
  } catch {
    return "요청을 처리하지 못했습니다.";
  }
}

function createInviteUrl(token: string) {
  if (typeof window === "undefined") {
    return `/invite/${token}`;
  }

  return buildInviteUrl(window.location.origin, token);
}

export function MembersTab({
  members,
  inviteLinks,
  onMembersUpdate,
  onLinksUpdate,
  onError,
}: MembersTabProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | MemberRoleValue>("ALL");
  const [roleTarget, setRoleTarget] = useState<WorkspaceMemberRow | null>(null);
  const [roleValue, setRoleValue] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMemberRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    role: "MEMBER",
    expireDays: "7",
    memo: "",
  });
  const [submittingRole, setSubmittingRole] = useState(false);
  const [submittingRemove, setSubmittingRemove] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [linkLoadingId, setLinkLoadingId] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesRole = roleFilter === "ALL" ? true : member.role === roleFilter;
      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        keyword.length === 0 ||
        member.name.toLowerCase().includes(keyword) ||
        member.email.toLowerCase().includes(keyword);

      return matchesRole && matchesSearch;
    });
  }, [members, roleFilter, search]);

  async function handleRoleSave() {
    if (!roleTarget) return;

    setSubmittingRole(true);
    onError(null);

    try {
      const response = await fetch(`/api/settings/members/${roleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleValue }),
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as { member: WorkspaceMemberRow };
      onMembersUpdate(
        members.map((member) => (member.id === data.member.id ? data.member : member))
      );
      setRoleTarget(null);
      setInfoMessage("멤버 권한을 변경했습니다.");
    } catch {
      onError("멤버 권한을 변경하지 못했습니다.");
    } finally {
      setSubmittingRole(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;

    setSubmittingRemove(true);
    onError(null);

    try {
      const response = await fetch(`/api/settings/members/${removeTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as { memberId: string };
      onMembersUpdate(members.filter((member) => member.id !== data.memberId));
      setRemoveTarget(null);
      setInfoMessage("멤버를 워크스페이스에서 제외했습니다.");
    } catch {
      onError("멤버를 제외하지 못했습니다.");
    } finally {
      setSubmittingRemove(false);
    }
  }

  async function handleCreateInvite() {
    setSubmittingInvite(true);
    onError(null);

    try {
      const response = await fetch("/api/settings/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: inviteForm.role,
          expireDays: Number(inviteForm.expireDays),
          memo: inviteForm.memo.trim(),
        }),
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as { link: InviteLinkRow };
      onLinksUpdate([data.link, ...inviteLinks]);
      setGeneratedInviteUrl(createInviteUrl(data.link.token));
      setInfoMessage("새 초대 링크를 발급했습니다.");
    } catch {
      onError("초대 링크를 발급하지 못했습니다.");
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleInvalidateLink(link: InviteLinkRow) {
    setLinkLoadingId(link.id);
    onError(null);

    try {
      const response = await fetch(`/api/settings/invite/${link.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as { link: InviteLinkRow };
      onLinksUpdate(inviteLinks.map((row) => (row.id === data.link.id ? data.link : row)));
      setInfoMessage("초대 링크를 무효화했습니다.");
    } catch {
      onError("초대 링크를 무효화하지 못했습니다.");
    } finally {
      setLinkLoadingId(null);
    }
  }

  async function copyInviteUrl(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setInfoMessage("초대 링크를 복사했습니다.");
    } catch {
      onError("초대 링크를 복사하지 못했습니다.");
    }
  }

  return (
    <>
      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">멤버</div>
          <div className="min-w-0 flex-1">
            <h2 className="settings-card__title">멤버 관리</h2>
            <p className="settings-card__desc">
              현재 참여 중인 멤버를 확인하고 권한을 조정할 수 있습니다. OWNER 권한은
              변경하거나 제외할 수 없습니다.
            </p>
          </div>
          <button
            type="button"
            className="primary-button btn--sm"
            onClick={() => {
              setGeneratedInviteUrl(null);
              setInviteOpen(true);
            }}
          >
            + 멤버 초대
          </button>
        </div>

        <div className="settings-card__body space-y-4">
          <div className="settings-toolbar">
            <div className="settings-toolbar__left">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="form-input min-w-[240px]"
                placeholder="이름 또는 이메일 검색"
              />
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as "ALL" | MemberRoleValue)
                }
                className="form-select min-w-[170px]"
              >
                <option value="ALL">전체 권한</option>
                <option value="OWNER">OWNER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="MEMBER">MEMBER</option>
              </select>
            </div>
            <div className="text-sm text-[var(--text-muted)]">총 {members.length}명</div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>멤버</th>
                  <th>이메일</th>
                  <th>권한</th>
                  <th>참여일</th>
                  <th className="text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="settings-empty-state">
                        <p className="empty-panel__title">조건에 맞는 멤버가 없습니다.</p>
                        <p className="empty-panel__description">
                          검색어를 지우거나 권한 필터를 바꿔 다시 확인해 주세요.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-light)] text-sm font-bold text-[var(--accent)]">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--text-primary)]">
                              {member.name}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {member.department ?? "부서 정보 없음"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{member.email}</td>
                      <td>
                        <span className={getRoleBadgeClass(member.role)}>{member.role}</span>
                      </td>
                      <td>{format(new Date(member.joinedAt), "yyyy.MM.dd", { locale: ko })}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          {member.role === "OWNER" ? (
                            <span className="text-xs text-[var(--text-muted)]">변경 불가</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="secondary-button btn--sm"
                                onClick={() => {
                                  setRoleTarget(member);
                                  setRoleValue(member.role === "ADMIN" ? "ADMIN" : "MEMBER");
                                }}
                              >
                                권한 변경
                              </button>
                              <button
                                type="button"
                                className="danger-button btn--sm"
                                onClick={() => setRemoveTarget(member)}
                              >
                                제외
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">초대</div>
          <div className="min-w-0 flex-1">
            <h2 className="settings-card__title">초대 링크</h2>
            <p className="settings-card__desc">
              역할과 만료 기간을 지정한 초대 링크를 발급하고, 사용 중인 링크를 관리합니다.
            </p>
          </div>
        </div>

        <div className="settings-card__body space-y-4">
          {infoMessage ? (
            <div className="rounded-2xl border border-[#b7e4c7] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
              {infoMessage}
            </div>
          ) : null}

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>초대 링크</th>
                  <th>권한</th>
                  <th>만료</th>
                  <th>사용 횟수</th>
                  <th>메모</th>
                  <th>상태</th>
                  <th className="text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {inviteLinks.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="settings-empty-state">
                        <p className="empty-panel__title">발급된 초대 링크가 없습니다.</p>
                        <p className="empty-panel__description">
                          상단의 멤버 초대 버튼으로 새 초대 링크를 만들 수 있습니다.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inviteLinks.map((link) => {
                    const url = createInviteUrl(link.token);
                    return (
                      <tr key={link.id}>
                        <td>
                          <div className="max-w-[260px] truncate font-mono text-xs text-[var(--text-secondary)]">
                            {url}
                          </div>
                        </td>
                        <td>
                          <span className={getRoleBadgeClass(link.role)}>{link.role}</span>
                        </td>
                        <td>
                          {link.expiresAt
                            ? format(new Date(link.expiresAt), "yyyy.MM.dd HH:mm", {
                                locale: ko,
                              })
                            : "무기한"}
                        </td>
                        <td>{link.usedCount}</td>
                        <td>{link.memo || "-"}</td>
                        <td>
                          <span
                            className={
                              link.expired
                                ? "status-badge status-badge--danger"
                                : "status-badge status-badge--success"
                            }
                          >
                            {link.expired ? "만료" : "사용 중"}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="secondary-button btn--sm"
                              onClick={() => copyInviteUrl(url)}
                            >
                              복사
                            </button>
                            <button
                              type="button"
                              className="danger-button btn--sm"
                              onClick={() => handleInvalidateLink(link)}
                              disabled={link.expired || linkLoadingId === link.id}
                            >
                              {linkLoadingId === link.id ? "처리 중..." : "무효화"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Dialog open={!!roleTarget} onOpenChange={(open) => (!open ? setRoleTarget(null) : null)}>
        <DialogContent style={{ maxWidth: "30rem" }}>
          <DialogHeader>
            <div>
              <DialogTitle>멤버 권한 변경</DialogTitle>
              <DialogDescription>
                {roleTarget ? `${roleTarget.name}님의 권한을 변경합니다.` : ""}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="modal-body space-y-4">
            <label className="field">
              <span className="field-label">권한</span>
              <select
                value={roleValue}
                onChange={(event) =>
                  setRoleValue(event.target.value as "ADMIN" | "MEMBER")
                }
                className="form-select"
              >
                <option value="ADMIN">관리자 (ADMIN)</option>
                <option value="MEMBER">멤버 (MEMBER)</option>
              </select>
            </label>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setRoleTarget(null)}
              disabled={submittingRole}
            >
              취소
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleRoleSave}
              disabled={submittingRole}
            >
              {submittingRole ? "저장 중..." : "권한 저장"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(open) => (!open ? setRemoveTarget(null) : null)}>
        <DialogContent style={{ maxWidth: "30rem" }}>
          <DialogHeader>
            <div>
              <DialogTitle>멤버 제외</DialogTitle>
              <DialogDescription>
                {removeTarget ? `${removeTarget.name}님을 워크스페이스에서 제외합니다.` : ""}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="modal-body">
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              멤버를 제외하면 현재 워크스페이스 데이터에 더 이상 접근할 수 없습니다. 필요하면
              이후에 다시 초대 링크로 참여시킬 수 있습니다.
            </p>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setRemoveTarget(null)}
              disabled={submittingRemove}
            >
              취소
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleRemove}
              disabled={submittingRemove}
            >
              {submittingRemove ? "처리 중..." : "멤버 제외"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setGeneratedInviteUrl(null);
            setInviteForm({ role: "MEMBER", expireDays: "7", memo: "" });
          }
        }}
      >
        <DialogContent style={{ maxWidth: "34rem" }}>
          <DialogHeader>
            <div>
              <DialogTitle>새 초대 링크 생성</DialogTitle>
              <DialogDescription>
                역할, 만료 기간, 메모를 입력해 멤버용 초대 링크를 발급합니다.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="modal-body space-y-4">
            <div className="settings-grid-two">
              <label className="field">
                <span className="field-label">권한</span>
                <select
                  value={inviteForm.role}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      role: event.target.value as "ADMIN" | "MEMBER",
                    }))
                  }
                  className="form-select"
                >
                  <option value="MEMBER">멤버 (MEMBER)</option>
                  <option value="ADMIN">관리자 (ADMIN)</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">만료 기간</span>
                <select
                  value={inviteForm.expireDays}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      expireDays: event.target.value as InviteFormState["expireDays"],
                    }))
                  }
                  className="form-select"
                >
                  <option value="1">1일</option>
                  <option value="7">7일</option>
                  <option value="30">30일</option>
                  <option value="0">무기한</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span className="field-label">메모</span>
              <input
                value={inviteForm.memo}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, memo: event.target.value }))
                }
                className="form-input"
                placeholder="채용 후보, 외부 협업자 등 용도를 기록해 둘 수 있습니다"
              />
            </label>
            {generatedInviteUrl ? (
              <div className="settings-link-box">
                <div className="settings-link-box__value">{generatedInviteUrl}</div>
                <button
                  type="button"
                  className="secondary-button btn--sm"
                  onClick={() => copyInviteUrl(generatedInviteUrl)}
                >
                  복사
                </button>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setInviteOpen(false)}
              disabled={submittingInvite}
            >
              닫기
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleCreateInvite}
              disabled={submittingInvite}
            >
              {submittingInvite ? "생성 중..." : "초대 링크 생성"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
