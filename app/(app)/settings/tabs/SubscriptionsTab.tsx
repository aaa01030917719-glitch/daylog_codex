"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  SUBSCRIPTION_ALERT_LEVEL_LABELS,
  SUBSCRIPTION_BILLING_CYCLE_LABELS,
  SUBSCRIPTION_BILLING_CYCLE_VALUES,
  SUBSCRIPTION_SORT_LABELS,
  SUBSCRIPTION_SORT_VALUES,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_VALUES,
  getSubscriptionAlertClassName,
  isSubscriptionStatusValue,
  type SubscriptionAlertLevel,
  type SubscriptionListMeta,
  type SubscriptionServiceDetail,
  type SubscriptionServiceStatusValue,
  type SubscriptionServiceSummary,
  type SubscriptionSortValue,
} from "@/lib/subscription-services";
import type { MemberRoleValue, WorkspaceMemberRow } from "../types";
import {
  DEFAULT_SUBSCRIPTION_FORM,
  createSubscriptionFormState,
  formatCurrencyAmount,
  readListResponseError,
  readResponseError,
  validateSubscriptionForm,
} from "./subscriptions-shared";
import { SubscriptionsConfirmDialog } from "./SubscriptionsConfirmDialog";
import { SubscriptionsFormDialog } from "./SubscriptionsFormDialog";

interface SubscriptionsTabProps {
  members: WorkspaceMemberRow[];
  userRole: MemberRoleValue;
  onError: (message: string | null) => void;
}

function createEmptyMeta(): SubscriptionListMeta {
  return {
    categories: [],
    managers: [],
    summary: {
      totalCount: 0,
      activeCount: 0,
      monthlyCostTotal: 0,
      annualCostTotal: 0,
      urgentCount: 0,
    },
  };
}

export function SubscriptionsTab({ members, userRole, onError }: SubscriptionsTabProps) {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const canDelete = userRole === "OWNER";
  const [services, setServices] = useState<SubscriptionServiceSummary[]>([]);
  const [meta, setMeta] = useState<SubscriptionListMeta>(createEmptyMeta);
  const [loading, setLoading] = useState(true);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SubscriptionServiceStatusValue>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [billingCycleFilter, setBillingCycleFilter] = useState<"ALL" | (typeof SUBSCRIPTION_BILLING_CYCLE_VALUES)[number]>("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [alertFilter, setAlertFilter] = useState<"ALL" | SubscriptionAlertLevel>("ALL");
  const [sort, setSort] = useState<SubscriptionSortValue>("NEXT_BILLING_ASC");
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_SUBSCRIPTION_FORM);
  const [initialForm, setInitialForm] = useState(DEFAULT_SUBSCRIPTION_FORM);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [detailLogs, setDetailLogs] = useState<SubscriptionServiceDetail["logs"]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, SubscriptionServiceStatusValue>>({});
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [endingTarget, setEndingTarget] = useState<SubscriptionServiceSummary | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<SubscriptionServiceSummary | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (billingCycleFilter !== "ALL") params.set("billingCycle", billingCycleFilter);
      if (managerFilter !== "ALL") params.set("managerUserId", managerFilter);
      if (alertFilter !== "ALL") params.set("alertLevel", alertFilter);

      const response = await fetch(`/api/subscriptions?${params.toString()}`);
      if (!response.ok) {
        onError(
          await readListResponseError(
            response,
            "구독 서비스 목록을 불러오지 못했습니다."
          )
        );
        return;
      }

      const data = (await response.json()) as {
        services: SubscriptionServiceSummary[];
        meta: SubscriptionListMeta;
      };
      setServices(data.services);
      setMeta(data.meta);
      setStatusDrafts(Object.fromEntries(data.services.map((service) => [service.id, service.status])));
      onError(null);
    } catch {
      onError("구독 서비스 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [alertFilter, billingCycleFilter, canManage, categoryFilter, managerFilter, onError, search, sort, statusFilter]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const statCards = useMemo(
    () => [
      { label: "관리 중 서비스", value: `${meta.summary.totalCount}개`, sub: "현재 필터 기준 집계입니다." },
      { label: "월 환산 비용", value: formatCurrencyAmount(meta.summary.monthlyCostTotal, "KRW"), sub: "1회성 비용은 제외됩니다." },
      { label: "연 환산 비용", value: formatCurrencyAmount(meta.summary.annualCostTotal, "KRW"), sub: "결제 주기별 환산 기준입니다." },
      { label: "긴급 결제", value: `${meta.summary.urgentCount}건`, sub: "연체 또는 3일 이내 항목입니다." },
    ],
    [meta.summary]
  );

  const openCreate = () => {
    setEditingServiceId(null);
    setDetailLogs([]);
    setForm(DEFAULT_SUBSCRIPTION_FORM);
    setInitialForm(DEFAULT_SUBSCRIPTION_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = async (serviceId: string) => {
    setDetailLoading(true);
    setEditingServiceId(serviceId);
    try {
      const response = await fetch(`/api/subscriptions/${serviceId}`);
      if (!response.ok) {
        onError(await readResponseError(response, "서비스 상세 정보를 불러오지 못했습니다."));
        return;
      }
      const data = (await response.json()) as { service: SubscriptionServiceDetail };
      const nextForm = createSubscriptionFormState(data.service);
      setForm(nextForm);
      setInitialForm(nextForm);
      setDetailLogs(data.service.logs);
      setFormError(null);
      setFormOpen(true);
    } catch {
      onError("서비스 상세 정보를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  const submitForm = async () => {
    const validationMessage = validateSubscriptionForm(form);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch(editingServiceId ? `/api/subscriptions/${editingServiceId}` : "/api/subscriptions", {
        method: editingServiceId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          billingAmount: Number(form.billingAmount),
          managerUserId: form.managerUserId || null,
          firstPaidAt: form.firstPaidAt || null,
        }),
      });

      if (!response.ok) {
        setFormError(
          await readResponseError(
            response,
            editingServiceId ? "서비스 수정에 실패했습니다." : "서비스 등록에 실패했습니다."
          )
        );
        return;
      }

      setInfoMessage(editingServiceId ? "구독 서비스를 수정했습니다." : "구독 서비스를 등록했습니다.");
      setFormOpen(false);
      setEditingServiceId(null);
      setDetailLogs([]);
      await loadServices();
    } catch {
      setFormError(editingServiceId ? "서비스 수정에 실패했습니다." : "서비스 등록에 실패했습니다.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (service: SubscriptionServiceSummary) => {
    const nextStatus = statusDrafts[service.id] ?? service.status;
    if (!isSubscriptionStatusValue(nextStatus) || nextStatus === service.status) return;

    setStatusUpdatingId(service.id);
    try {
      const response = await fetch(`/api/subscriptions/${service.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        onError(await readResponseError(response, "상태를 변경하지 못했습니다."));
        return;
      }

      setInfoMessage("상태를 변경했습니다.");
      await loadServices();
    } catch {
      onError("상태를 변경하지 못했습니다.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const runAction = async (serviceId: string, action: "end" | "delete") => {
    setActionLoadingId(serviceId);
    try {
      const response = await fetch(`/api/subscriptions/${serviceId}${action === "end" ? "/end" : ""}`, {
        method: action === "end" ? "POST" : "DELETE",
      });

      if (!response.ok) {
        onError(
          await readResponseError(
            response,
            action === "end" ? "종료 처리에 실패했습니다." : "삭제에 실패했습니다."
          )
        );
        return;
      }

      setInfoMessage(action === "end" ? "구독 서비스를 종료 처리했습니다." : "구독 서비스를 삭제했습니다.");
      setEndingTarget(null);
      setDeletingTarget(null);
      await loadServices();
    } catch {
      onError(action === "end" ? "종료 처리에 실패했습니다." : "삭제에 실패했습니다.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!canManage) {
    return (
      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">구독</div>
          <div>
            <h2 className="settings-card__title">구독 서비스 관리</h2>
            <p className="settings-card__desc">관리자 이상 권한에서만 구독 서비스 운영 대장을 관리할 수 있습니다.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">구독</div>
          <div className="min-w-0 flex-1">
            <h2 className="settings-card__title">구독 서비스 관리</h2>
            <p className="settings-card__desc">서비스별 비용, 결제 주기, 다음 결제일과 담당자를 운영 대장처럼 관리합니다.</p>
          </div>
          <button type="button" className="primary-button btn--sm" onClick={openCreate}>
            + 서비스 등록
          </button>
        </div>

        <div className="settings-card__body space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            카드번호, 계좌번호, 비밀번호, API Key, 토큰, 라이선스 키 같은 민감정보는 저장하지 않습니다.
          </div>

          {infoMessage ? (
            <div className="rounded-2xl border border-[#b7e4c7] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
              {infoMessage}
            </div>
          ) : null}

          <div className="settings-summary-grid">
            {statCards.map((card) => (
              <div key={card.label} className="settings-stat-card">
                <div className="settings-stat-card__label">{card.label}</div>
                <div className="settings-stat-card__value">{card.value}</div>
                <div className="settings-stat-card__sub">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="settings-toolbar">
            <div className="settings-toolbar__left flex flex-wrap gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="form-input min-w-[220px]"
                placeholder="서비스명, 담당자, 사용 목적 검색"
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="form-select min-w-[150px]">
                <option value="ALL">전체 상태</option>
                {SUBSCRIPTION_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>{SUBSCRIPTION_STATUS_LABELS[value]}</option>
                ))}
              </select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="form-select min-w-[150px]">
                <option value="ALL">전체 카테고리</option>
                {meta.categories.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
              <select value={billingCycleFilter} onChange={(event) => setBillingCycleFilter(event.target.value as typeof billingCycleFilter)} className="form-select min-w-[150px]">
                <option value="ALL">전체 결제 주기</option>
                {SUBSCRIPTION_BILLING_CYCLE_VALUES.map((value) => (
                  <option key={value} value={value}>{SUBSCRIPTION_BILLING_CYCLE_LABELS[value]}</option>
                ))}
              </select>
              <select value={managerFilter} onChange={(event) => setManagerFilter(event.target.value)} className="form-select min-w-[150px]">
                <option value="ALL">전체 담당자</option>
                {meta.managers.map((manager) => (
                  <option key={manager.value} value={manager.value}>{manager.label}</option>
                ))}
              </select>
              <select value={alertFilter} onChange={(event) => setAlertFilter(event.target.value as typeof alertFilter)} className="form-select min-w-[150px]">
                <option value="ALL">전체 결제 알림</option>
                {(["overdue", "urgent", "warning", "normal"] as SubscriptionAlertLevel[]).map((value) => (
                  <option key={value} value={value}>{SUBSCRIPTION_ALERT_LEVEL_LABELS[value]}</option>
                ))}
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value as SubscriptionSortValue)} className="form-select min-w-[170px]">
                {SUBSCRIPTION_SORT_VALUES.map((value) => (
                  <option key={value} value={value}>{SUBSCRIPTION_SORT_LABELS[value]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>서비스</th>
                  <th>상태</th>
                  <th>담당자</th>
                  <th>결제 정보</th>
                  <th>다음 결제일</th>
                  <th>사용 목적</th>
                  <th className="text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="settings-empty-state">
                        <p className="empty-panel__title">구독 서비스 목록을 불러오는 중입니다.</p>
                        <p className="empty-panel__description">잠시만 기다려주세요.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {!loading && services.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="settings-empty-state">
                        <p className="empty-panel__title">조건에 맞는 서비스가 없습니다.</p>
                        <p className="empty-panel__description">검색어나 필터를 바꾸거나 새 서비스를 등록해보세요.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? services.map((service) => {
                      const nextStatus = statusDrafts[service.id] ?? service.status;

                      return (
                        <tr key={service.id}>
                          <td>
                            <div className="space-y-1">
                              <div className="font-semibold text-[var(--text-primary)]">{service.serviceName}</div>
                              <div className="text-xs text-[var(--text-muted)]">{service.planName || service.category || "분류 없음"}</div>
                            </div>
                          </td>
                          <td>
                            <div className="space-y-2">
                              <span className={getStatusBadgeClass(service.status)}>{SUBSCRIPTION_STATUS_LABELS[service.status]}</span>
                              <select
                                value={nextStatus}
                                onChange={(event) => setStatusDrafts((current) => ({ ...current, [service.id]: event.target.value as SubscriptionServiceStatusValue }))}
                                className="form-select min-w-[148px]"
                              >
                                {SUBSCRIPTION_STATUS_VALUES.map((value) => (
                                  <option key={value} value={value}>{SUBSCRIPTION_STATUS_LABELS[value]}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="secondary-button btn--sm"
                                disabled={nextStatus === service.status || statusUpdatingId === service.id}
                                onClick={() => void handleStatusChange(service)}
                              >
                                {statusUpdatingId === service.id ? "변경 중..." : "상태 변경"}
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className="space-y-1">
                              <div>{service.managerName ?? "미정"}</div>
                              <div className="text-xs text-[var(--text-muted)]">{service.teamName ?? "팀 미정"}</div>
                            </div>
                          </td>
                          <td>
                            <div className="space-y-1">
                              <div>{formatCurrencyAmount(service.billingAmount, service.currency)}</div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {SUBSCRIPTION_BILLING_CYCLE_LABELS[service.billingCycle]} · 월 환산 {formatCurrencyAmount(service.monthlyCostNormalized, service.currency)}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="space-y-2">
                              <div>{format(new Date(service.nextBillingAt), "yyyy.MM.dd", { locale: ko })}</div>
                              <span className={getSubscriptionAlertClassName(service.alertLevel)}>{SUBSCRIPTION_ALERT_LEVEL_LABELS[service.alertLevel]}</span>
                            </div>
                          </td>
                          <td className="max-w-[220px]">
                            <div className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{service.purpose?.trim() || "-"}</div>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="secondary-button btn--sm"
                                onClick={() => void openEdit(service.id)}
                                disabled={detailLoading && editingServiceId === service.id}
                              >
                                {detailLoading && editingServiceId === service.id ? "불러오는 중..." : "수정"}
                              </button>
                              {service.status !== "ENDED" ? (
                                <button type="button" className="secondary-button btn--sm" onClick={() => setEndingTarget(service)}>
                                  종료 처리
                                </button>
                              ) : null}
                              {canDelete ? (
                                <button type="button" className="danger-button btn--sm" onClick={() => setDeletingTarget(service)}>
                                  삭제
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <SubscriptionsFormDialog
        open={formOpen}
        editingServiceId={editingServiceId}
        loading={detailLoading}
        submitting={formSubmitting}
        error={formError}
        form={form}
        initialForm={initialForm}
        logs={detailLogs}
        members={members}
        onClose={() => {
          setFormOpen(false);
          setEditingServiceId(null);
          setDetailLogs([]);
          setForm(DEFAULT_SUBSCRIPTION_FORM);
          setInitialForm(DEFAULT_SUBSCRIPTION_FORM);
          setFormError(null);
        }}
        onSubmit={() => void submitForm()}
        onChange={(updater) => setForm((current) => updater(current))}
      />

      <SubscriptionsConfirmDialog
        open={!!endingTarget}
        title="구독 서비스를 종료 처리할까요?"
        description="종료 처리하면 목록과 이력은 남기고, 기본 화면에서는 더 이상 사용 중으로 보이지 않습니다."
        confirmLabel="종료 처리"
        loading={actionLoadingId === endingTarget?.id}
        onClose={() => setEndingTarget(null)}
        onConfirm={() => endingTarget && void runAction(endingTarget.id, "end")}
      >
        {endingTarget ? (
          <p>
            <span className="font-semibold text-[var(--text-primary)]">{endingTarget.serviceName}</span> 서비스를 종료 상태로 변경합니다.
          </p>
        ) : null}
      </SubscriptionsConfirmDialog>

      <SubscriptionsConfirmDialog
        open={!!deletingTarget}
        title="서비스를 삭제할까요?"
        description="삭제는 owner만 가능하고, 종료 처리보다 더 강한 조치입니다."
        confirmLabel="삭제"
        confirmTone="danger"
        loading={actionLoadingId === deletingTarget?.id}
        onClose={() => setDeletingTarget(null)}
        onConfirm={() => deletingTarget && void runAction(deletingTarget.id, "delete")}
      >
        {deletingTarget ? (
          <p>
            <span className="font-semibold text-[var(--text-primary)]">{deletingTarget.serviceName}</span> 항목을 목록에서 제거합니다. 정말 삭제할지 다시 확인해주세요.
          </p>
        ) : null}
      </SubscriptionsConfirmDialog>
    </>
  );
}

function getStatusBadgeClass(status: SubscriptionServiceStatusValue) {
  if (status === "ACTIVE") return "status-badge status-badge--success";
  if (status === "CANCEL_SCHEDULED") return "status-badge status-badge--warning";
  if (status === "ENDED") return "status-badge status-badge--neutral";
  return "status-badge status-badge--accent";
}
