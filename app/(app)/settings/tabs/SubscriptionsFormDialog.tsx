"use client";

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
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import {
  SUBSCRIPTION_BILLING_CYCLE_LABELS,
  SUBSCRIPTION_BILLING_CYCLE_VALUES,
  SUBSCRIPTION_LOG_ACTION_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_VALUES,
  calculateSubscriptionNormalizedCosts,
  type SubscriptionBillingCycleValue,
  type SubscriptionServiceDetail,
  type SubscriptionServiceStatusValue,
} from "@/lib/subscription-services";
import type { WorkspaceMemberRow } from "../types";
import {
  type SubscriptionFormState,
  formatCurrencyAmount,
} from "./subscriptions-shared";

interface SubscriptionsFormDialogProps {
  open: boolean;
  editingServiceId: string | null;
  loading?: boolean;
  submitting?: boolean;
  error: string | null;
  form: SubscriptionFormState;
  initialForm: SubscriptionFormState;
  logs: SubscriptionServiceDetail["logs"];
  members: WorkspaceMemberRow[];
  onClose: () => void;
  onSubmit: () => void;
  onChange: (updater: (current: SubscriptionFormState) => SubscriptionFormState) => void;
}

export function SubscriptionsFormDialog({
  open,
  editingServiceId,
  loading = false,
  submitting = false,
  error,
  form,
  initialForm,
  logs,
  members,
  onClose,
  onSubmit,
  onChange,
}: SubscriptionsFormDialogProps) {
  const preview = calculateSubscriptionNormalizedCosts(
    Number(form.billingAmount) || 0,
    form.billingCycle
  );
  const formDirty = open && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { requestClose } = useDirtyLeaveGuard({
    isDirty: formDirty,
    onDiscard: onClose,
    disabled: submitting || !open,
    message: "나가면 이 내용은 저장되지 않고 사라집니다.",
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          requestClose();
        }
      }}
    >
      <DialogContent style={{ maxWidth: "62rem" }}>
        <DialogHeader>
          <div>
            <DialogTitle>
              {editingServiceId ? "구독 서비스 수정" : "구독 서비스 등록"}
            </DialogTitle>
            <DialogDescription>
              서비스 운영 대장 용도로만 사용하고, 민감한 결제/인증 정보는 저장하지 않습니다.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="modal-body space-y-5">
          {loading ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              상세 정보를 불러오는 중입니다.
            </div>
          ) : null}

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">서비스명</span>
              <input
                value={form.serviceName}
                onChange={(event) =>
                  onChange((current) => ({ ...current, serviceName: event.target.value }))
                }
                className="form-input"
                placeholder="서비스명을 입력해주세요"
              />
            </label>
            <label className="field">
              <span className="field-label">웹사이트 주소</span>
              <input
                value={form.websiteUrl}
                onChange={(event) =>
                  onChange((current) => ({ ...current, websiteUrl: event.target.value }))
                }
                className="form-input"
                placeholder="https://example.com"
              />
            </label>
          </div>

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">카테고리</span>
              <input
                value={form.category}
                onChange={(event) =>
                  onChange((current) => ({ ...current, category: event.target.value }))
                }
                className="form-input"
                placeholder="업무툴, 디자인, 인프라 등"
              />
            </label>
            <label className="field">
              <span className="field-label">플랜명</span>
              <input
                value={form.planName}
                onChange={(event) =>
                  onChange((current) => ({ ...current, planName: event.target.value }))
                }
                className="form-input"
                placeholder="플랜명을 적어주세요"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="field md:col-span-2">
              <span className="field-label">결제 금액</span>
              <input
                value={form.billingAmount}
                onChange={(event) =>
                  onChange((current) => ({ ...current, billingAmount: event.target.value }))
                }
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </label>
            <label className="field">
              <span className="field-label">통화</span>
              <input
                value={form.currency}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    currency: event.target.value.toUpperCase(),
                  }))
                }
                className="form-input"
                placeholder="KRW"
                maxLength={10}
              />
            </label>
            <label className="field">
              <span className="field-label">결제 주기</span>
              <select
                value={form.billingCycle}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    billingCycle: event.target.value as SubscriptionBillingCycleValue,
                  }))
                }
                className="form-select"
              >
                {SUBSCRIPTION_BILLING_CYCLE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {SUBSCRIPTION_BILLING_CYCLE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">첫 결제일</span>
              <input
                type="date"
                value={form.firstPaidAt}
                onChange={(event) =>
                  onChange((current) => ({ ...current, firstPaidAt: event.target.value }))
                }
                className="form-input"
              />
            </label>
            <label className="field">
              <span className="field-label">다음 결제일</span>
              <input
                type="date"
                value={form.nextBillingAt}
                onChange={(event) =>
                  onChange((current) => ({ ...current, nextBillingAt: event.target.value }))
                }
                className="form-input"
              />
            </label>
          </div>

          <div className="settings-summary-grid">
            <div className="settings-stat-card">
              <div className="settings-stat-card__label">월 환산 비용</div>
              <div className="settings-stat-card__value">
                {formatCurrencyAmount(preview.monthlyCostNormalized, form.currency || "KRW")}
              </div>
              <div className="settings-stat-card__sub">주기에 맞춰 자동 계산됩니다.</div>
            </div>
            <div className="settings-stat-card">
              <div className="settings-stat-card__label">연 환산 비용</div>
              <div className="settings-stat-card__value">
                {formatCurrencyAmount(preview.annualCostNormalized, form.currency || "KRW")}
              </div>
              <div className="settings-stat-card__sub">일회성 결제는 0으로 처리합니다.</div>
            </div>
          </div>

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">담당자</span>
              <select
                value={form.managerUserId}
                onChange={(event) =>
                  onChange((current) => ({ ...current, managerUserId: event.target.value }))
                }
                className="form-select"
              >
                <option value="">미지정</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">팀명</span>
              <input
                value={form.teamName}
                onChange={(event) =>
                  onChange((current) => ({ ...current, teamName: event.target.value }))
                }
                className="form-input"
                placeholder="담당 팀이 있으면 적어주세요"
              />
            </label>
          </div>

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">상태</span>
              <select
                value={form.status}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    status: event.target.value as SubscriptionServiceStatusValue,
                  }))
                }
                className="form-select"
              >
                {SUBSCRIPTION_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {SUBSCRIPTION_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">종료 방법</span>
              <input
                value={form.cancellationMethod}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    cancellationMethod: event.target.value,
                  }))
                }
                className="form-input"
                placeholder="관리 콘솔 직접 해지, 메일 요청 등"
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">사용 목적</span>
            <textarea
              value={form.purpose}
              onChange={(event) =>
                onChange((current) => ({ ...current, purpose: event.target.value }))
              }
              className="form-textarea min-h-[100px]"
              placeholder="왜 사용 중인지, 어떤 팀이 쓰는지 적어주세요"
            />
          </label>

          <label className="field">
            <span className="field-label">메모</span>
            <textarea
              value={form.memo}
              onChange={(event) =>
                onChange((current) => ({ ...current, memo: event.target.value }))
              }
              className="form-textarea min-h-[120px]"
              placeholder="인수인계나 갱신 참고 사항만 남겨주세요"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
              {error}
            </div>
          ) : null}

          {editingServiceId ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-[var(--text-primary)]">최근 변경 기록</div>
              {logs.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  아직 기록이 없습니다.
                </div>
              ) : (
                logs.map((log) => (
                  <article key={log.id} className="list-card">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-badge status-badge--neutral">
                          {SUBSCRIPTION_LOG_ACTION_LABELS[log.actionType]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {log.actorName}
                      </p>
                      <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
                        {format(new Date(log.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <button type="button" className="secondary-button" onClick={requestClose} disabled={submitting}>
            취소
          </button>
          <button type="button" className="primary-button" onClick={onSubmit} disabled={submitting}>
            {submitting
              ? editingServiceId
                ? "저장 중..."
                : "등록 중..."
              : editingServiceId
                ? "변경 사항 저장"
                : "서비스 등록"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
