"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Check,
  FileText,
  Landmark,
  Plane,
  X,
} from "lucide-react";
import {
  buildDocumentTitle,
  calculateLeaveDays,
  formatLeaveSummaryDays,
  getDocumentTypeLabel,
  getHalfDayPeriodLabel,
  type DocumentCreatePayload,
  type DocumentMemberOption,
  type DocumentStats,
  type DocumentTypeValue,
  type HalfDayPeriodValue,
} from "@/lib/documents";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";

interface DocCreateModalProps {
  open: boolean;
  submitting: boolean;
  error: string | null;
  approverName: string;
  members: DocumentMemberOption[];
  stats: DocumentStats;
  onClose: () => void;
  onSubmit: (payload: DocumentCreatePayload) => Promise<void> | void;
}

const STEP_LABELS = ["신청 종류", "문서 작성", "참조자 지정", "최종 확인"] as const;

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function TypeCard({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[14px] border p-4 text-left transition ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-light)] shadow-[var(--shadow-sm)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)]"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[var(--accent)] shadow-[var(--shadow-sm)]">
        {icon}
      </div>
      <div className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{description}</div>
    </button>
  );
}

export function DocCreateModal({
  open,
  submitting,
  error,
  approverName,
  members,
  stats,
  onClose,
  onSubmit,
}: DocCreateModalProps) {
  const todayValue = useMemo(() => getTodayValue(), []);
  const [step, setStep] = useState(0);
  const [type, setType] = useState<DocumentTypeValue>("LEAVE");
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriodValue>("AM");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayValue);
  const [endDate, setEndDate] = useState(todayValue);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [costType, setCostType] = useState("마케팅비");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [ccUserId, setCcUserId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const initialDraft = {
    type: "LEAVE" as DocumentTypeValue,
    halfDayPeriod: "AM" as HalfDayPeriodValue,
    title: "",
    startDate: todayValue,
    endDate: todayValue,
    reason: "",
    amount: "",
    costType: "마케팅비",
    attachmentName: null as string | null,
    ccUserId: "",
  };

  const isGroupedLeaveType =
    type === "LEAVE" ||
    type === "HALF_DAY" ||
    type === "AM_HALF_DAY" ||
    type === "PM_HALF_DAY";
  const isSingleDateType =
    type === "HALF_DAY" ||
    type === "AM_HALF_DAY" ||
    type === "PM_HALF_DAY" ||
    type === "OUT_OF_OFFICE" ||
    type === "EARLY_LEAVE" ||
    type === "APPROVAL";

  const isDirty =
    open &&
    (type !== initialDraft.type ||
      halfDayPeriod !== initialDraft.halfDayPeriod ||
      title !== initialDraft.title ||
      startDate !== initialDraft.startDate ||
      endDate !== initialDraft.endDate ||
      reason !== initialDraft.reason ||
      amount !== initialDraft.amount ||
      costType !== initialDraft.costType ||
      attachmentName !== initialDraft.attachmentName ||
      ccUserId !== initialDraft.ccUserId);

  const { requestClose } = useDirtyLeaveGuard({
    isDirty,
    onDiscard: onClose,
    disabled: submitting || !open,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const today = getTodayValue();
    setStep(0);
    setType("LEAVE");
    setHalfDayPeriod("AM");
    setTitle("");
    setStartDate(today);
    setEndDate(today);
    setReason("");
    setAmount("");
    setCostType("마케팅비");
    setAttachmentName(null);
    setCcUserId("");
    setLocalError(null);
  }, [open]);

  const dateRangeLabel = useMemo(() => {
    if (type === "HALF_DAY") {
      return startDate ? `${startDate} · ${getHalfDayPeriodLabel(halfDayPeriod)}` : "-";
    }

    if (
      type === "AM_HALF_DAY" ||
      type === "PM_HALF_DAY" ||
      type === "OUT_OF_OFFICE" ||
      type === "EARLY_LEAVE"
    ) {
      return startDate ? `${startDate} · ${getDocumentTypeLabel(type)}` : "-";
    }

    if (!startDate) {
      return "-";
    }

    return endDate ? `${startDate} - ${endDate}` : startDate;
  }, [endDate, halfDayPeriod, startDate, type]);

  const requestedLeaveDays = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const targetEndDate = isSingleDateType ? startDate : endDate;
    const end = targetEndDate ? new Date(`${targetEndDate}T00:00:00`) : null;

    return calculateLeaveDays(type, start, end);
  }, [endDate, isSingleDateType, startDate, type]);

  const projectedRemainingDays = Math.max(stats.remainingDays - requestedLeaveDays, 0);

  if (!open) {
    return null;
  }

  function validateCurrentStep() {
    if (step === 0) {
      return true;
    }

    if (step === 1) {
      if (!startDate) {
        setLocalError("날짜를 먼저 골라주세요.");
        return false;
      }

      if (!isSingleDateType && !endDate) {
        setLocalError("종료일을 입력해주세요.");
        return false;
      }

      if (!reason.trim()) {
        setLocalError("사유를 입력해주세요.");
        return false;
      }

      if (type === "APPROVAL" && !amount.trim()) {
        setLocalError("금액을 입력해주세요.");
        return false;
      }
    }

    setLocalError(null);
    return true;
  }

  async function handleSubmit() {
    if (!validateCurrentStep()) {
      return;
    }

    await onSubmit({
      title: title.trim() || null,
      type,
      halfDayPeriod: type === "HALF_DAY" ? halfDayPeriod : null,
      startDate: startDate || null,
      endDate: isSingleDateType ? startDate || null : endDate || null,
      reason: reason.trim(),
      amount: type === "APPROVAL" && amount.trim() ? Number(amount) : null,
      costType: type === "APPROVAL" ? costType : null,
      attachmentName,
      ccUserId: ccUserId || null,
    });
  }

  return (
    <div className="modal-shell" onClick={requestClose}>
      <div className="modal-overlay" />
      <div
        className="modal-card w-full max-w-[600px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">신청서 작성</h2>
            <p className="modal-subtitle">연차, 반차, 외근, 조퇴, 결재 문서를 차근차근 작성해요.</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="icon-button"
            aria-label="신청서 작성 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {STEP_LABELS.map((label, index) => {
              const isActive = index === step;
              const isDone = index < step;

              return (
                <div key={label} className="space-y-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                      isDone
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : isActive
                          ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
                    }`}
                  >
                    {isDone ? <Check size={16} /> : index + 1}
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {step === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TypeCard
                active={isGroupedLeaveType}
                icon={<CalendarRange size={18} />}
                title="연차/반차"
                description="연차, 오전반차, 오후반차를 선택할 수 있어요"
                onClick={() => setType("LEAVE")}
              />
              <TypeCard
                active={type === "OUT_OF_OFFICE" || type === "EARLY_LEAVE"}
                icon={<Plane size={18} />}
                title="외근/조퇴"
                description="외근 또는 조퇴를 선택할 수 있어요"
                onClick={() => setType("OUT_OF_OFFICE")}
              />
              <TypeCard
                active={type === "APPROVAL"}
                icon={<Landmark size={18} />}
                title="결재 요청"
                description="비용이나 예산 집행 확인을 요청해요"
                onClick={() => setType("APPROVAL")}
              />
              <TypeCard
                active={type === "OTHER"}
                icon={<FileText size={18} />}
                title="문서"
                description="기타 문서가 필요할 때 선택해요"
                onClick={() => setType("OTHER")}
              />

              {isGroupedLeaveType ? (
                <div className="sm:col-span-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    연차/반차 세부 유형
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {[
                      { value: "LEAVE", label: "연차" },
                      { value: "AM_HALF_DAY", label: "오전반차" },
                      { value: "PM_HALF_DAY", label: "오후반차" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setType(option.value as DocumentTypeValue)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium ${
                          type === option.value
                            ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {type === "OUT_OF_OFFICE" || type === "EARLY_LEAVE" ? (
                <div className="sm:col-span-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    외근/조퇴 세부 유형
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {[
                      { value: "OUT_OF_OFFICE", label: "외근" },
                      { value: "EARLY_LEAVE", label: "조퇴" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setType(option.value as DocumentTypeValue)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium ${
                          type === option.value
                            ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="field">
                <label className="field-label" htmlFor="document-title">
                  제목
                </label>
                <input
                  id="document-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="form-input"
                  placeholder="문서 제목을 입력해 주세요"
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  비워두면 신청 종류와 기간을 기준으로 제목이 자동 생성돼요.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field">
                  <label className="field-label" htmlFor="document-start-date">
                    시작일
                  </label>
                  <input
                    id="document-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      if (isSingleDateType) {
                        setEndDate(event.target.value);
                      }
                    }}
                    className="form-input"
                  />
                </div>
                {isSingleDateType ? null : (
                  <div className="field">
                    <label className="field-label" htmlFor="document-end-date">
                      종료일
                    </label>
                    <input
                      id="document-end-date"
                      type="date"
                      min={startDate}
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="form-input"
                    />
                  </div>
                )}
              </div>

              {isGroupedLeaveType ? (
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                  연차 {formatLeaveSummaryDays(stats.annualLeave)}일 중{' '}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatLeaveSummaryDays(stats.usedDays)}일
                  </span>
                  을 사용했고, 이번 요청까지 반영하면 남은 연차는{' '}
                  <span className="font-semibold text-[var(--accent)]">
                    {formatLeaveSummaryDays(projectedRemainingDays)}일
                  </span>
                  이에요.
                </div>
              ) : null}

              {type === "APPROVAL" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="field">
                    <label className="field-label" htmlFor="document-amount">
                      금액
                    </label>
                    <input
                      id="document-amount"
                      type="number"
                      min={0}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="document-cost-type">
                      용도
                    </label>
                    <select
                      id="document-cost-type"
                      value={costType}
                      onChange={(event) => setCostType(event.target.value)}
                      className="form-select"
                    >
                      <option value="마케팅비">마케팅비</option>
                      <option value="운영비">운영비</option>
                      <option value="교육비">교육비</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div className="field sm:col-span-2">
                    <label className="field-label" htmlFor="document-attachment">
                      첨부 파일
                    </label>
                    <input
                      id="document-attachment"
                      type="file"
                      onChange={(event) =>
                        setAttachmentName(event.target.files?.[0]?.name ?? null)
                      }
                      className="form-input"
                    />
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      파일명만 먼저 저장돼요.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="field">
                <label className="field-label" htmlFor="document-reason">
                  사유
                </label>
                <textarea
                  id="document-reason"
                  rows={5}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="form-textarea min-h-[110px]"
                  placeholder="간단히 적어주세요"
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">참조자 지정</div>
                <div className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  결재자는 자동으로 연결되고, 참조자는 신청 내용을 함께 확인할 사람만 선택하면 돼요.
                </div>
              </div>

              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">결재자</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-light)] text-sm font-semibold text-[var(--accent)]">
                    대
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {approverName}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      모든 신청은 대표 또는 관리자 확인이 필요해요.
                    </div>
                  </div>
                  <span className="status-badge status-badge--accent">필수</span>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="document-cc-user">
                  참조자
                </label>
                <select
                  id="document-cc-user"
                  value={ccUserId}
                  onChange={(event) => setCcUserId(event.target.value)}
                  className="form-select"
                >
                  <option value="">없음</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.role}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  참조자는 신청 내용만 함께 확인할 수 있어요.
                </p>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      제목
                    </span>
                    <span className="max-w-[320px] text-right text-sm text-[var(--text-secondary)]">
                      {title.trim() ||
                        buildDocumentTitle({
                          type,
                          startDate: startDate ? new Date(`${startDate}T00:00:00`) : null,
                          endDate:
                            isSingleDateType || !endDate
                              ? startDate
                                ? new Date(`${startDate}T00:00:00`)
                                : null
                              : new Date(`${endDate}T00:00:00`),
                          halfDayPeriod,
                          amount: amount.trim() ? Number(amount) : null,
                        })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      신청 종류
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {getDocumentTypeLabel(type)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      신청 기간
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{dateRangeLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      결재자
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{approverName}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">사유</span>
                    <span className="max-w-[320px] text-right text-sm leading-6 text-[var(--text-secondary)]">
                      {reason || "-"}
                    </span>
                  </div>
                  {type === "APPROVAL" ? (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          금액
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">
                          {amount ? `${Number(amount).toLocaleString("ko-KR")}원` : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          용도
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">{costType}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      참조자
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {members.find((member) => member.id === ccUserId)?.name ?? "없음"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--accent-light)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                신청하면 결재자에게 바로 전달돼요.
              </div>
            </div>
          ) : null}

          {localError || error ? (
            <div className="rounded-[14px] border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
              {localError ?? error}
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                setStep((current) => current - 1);
              }}
              className="secondary-button"
              disabled={submitting}
            >
              이전
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="secondary-button"
              disabled={submitting}
            >
              취소
            </button>
            {step < STEP_LABELS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (!validateCurrentStep()) {
                    return;
                  }

                  setStep((current) => current + 1);
                }}
                className="primary-button"
                disabled={submitting}
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                className="primary-button"
                disabled={submitting}
              >
                {submitting
                  ? "신청 중..."
                  : `${buildDocumentTitle({
                      type,
                      startDate: startDate ? new Date(`${startDate}T00:00:00`) : null,
                      endDate:
                        isSingleDateType || !endDate
                          ? startDate
                            ? new Date(`${startDate}T00:00:00`)
                            : null
                          : new Date(`${endDate}T00:00:00`),
                      halfDayPeriod,
                      amount: amount.trim() ? Number(amount) : null,
                    })} 신청하기`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
