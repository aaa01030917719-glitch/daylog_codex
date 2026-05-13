"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Ellipsis,
  ExternalLink,
  Pencil,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import type { MemberRoleValue, WorkspaceMemberRow } from "@/app/(app)/settings/types";
import {
  DEFAULT_SUBSCRIPTION_FORM,
  createSubscriptionFormState,
  formatCurrencyAmount,
  getSafeSubscriptionWebsiteUrl,
  readListResponseError,
  readResponseError,
  validateSubscriptionForm,
} from "@/app/(app)/settings/tabs/subscriptions-shared";
import { SubscriptionsConfirmDialog } from "@/app/(app)/settings/tabs/SubscriptionsConfirmDialog";
import { SubscriptionsFormDialog } from "@/app/(app)/settings/tabs/SubscriptionsFormDialog";
import { FilterChipGroup } from "@/components/ui/FilterChipGroup";
import {
  SUBSCRIPTION_BILLING_CYCLE_VALUES,
  type SubscriptionAlertLevel,
  type SubscriptionListResponse,
  type SubscriptionServiceDetail,
  type SubscriptionServiceSummary,
  type SubscriptionSortValue,
} from "@/lib/subscription-services";

interface SubscriptionsManagementPageProps {
  members: WorkspaceMemberRow[];
  userRole: MemberRoleValue;
  workspaceName: string;
}

type StatusTab = "ALL" | "ACTIVE" | "REVIEW" | "CANCEL_SCHEDULED" | "ENDED";

const STATUS_LABELS: Record<Exclude<StatusTab, "ALL">, string> = {
  ACTIVE: "사용 중",
  REVIEW: "검토 중",
  CANCEL_SCHEDULED: "해지 예정",
  ENDED: "종료",
};

const STATUS_FILTER_ITEMS: Array<{ value: StatusTab; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "ACTIVE", label: STATUS_LABELS.ACTIVE },
  { value: "REVIEW", label: STATUS_LABELS.REVIEW },
  { value: "CANCEL_SCHEDULED", label: STATUS_LABELS.CANCEL_SCHEDULED },
  { value: "ENDED", label: STATUS_LABELS.ENDED },
];

const BILLING_CYCLE_LABELS: Record<(typeof SUBSCRIPTION_BILLING_CYCLE_VALUES)[number], string> = {
  MONTHLY: "월간",
  YEARLY: "연간",
  QUARTERLY: "분기",
  HALF_YEARLY: "반기",
  ONE_TIME: "1회성",
};

const SORT_LABELS: Record<SubscriptionSortValue, string> = {
  NEXT_BILLING_ASC: "결제일 임박순",
  COST_DESC: "비용 높은 순",
  CREATED_DESC: "최근 등록순",
  UPDATED_DESC: "최근 수정순",
};

function getStatusBadgeClass(status: SubscriptionServiceSummary["status"]) {
  if (status === "ACTIVE") return "bg-[var(--success-light)] text-[var(--success)]";
  if (status === "REVIEW") return "bg-[var(--purple-light)] text-[var(--purple)]";
  if (status === "CANCEL_SCHEDULED") return "bg-[var(--warning-light)] text-[var(--warning)]";
  return "bg-[var(--surface-3)] text-[var(--text-muted)]";
}

function getAlertBadge(level: SubscriptionAlertLevel) {
  if (level === "overdue") {
    return { label: "확인 필요", className: "bg-[var(--danger)] text-white" };
  }

  if (level === "urgent") {
    return { label: "3일 이내", className: "bg-[var(--danger-light)] text-[var(--danger)]" };
  }

  if (level === "warning") {
    return { label: "7일 이내", className: "bg-[var(--warning-light)] text-[var(--warning)]" };
  }

  return { label: "여유 있음", className: "bg-[var(--surface-3)] text-[var(--text-muted)]" };
}

function getServiceGlyph(serviceName: string, index: number) {
  const palette = [
    "bg-[#fff7ed] text-[#f97316]",
    "bg-[#eff6ff] text-[#4f7cff]",
    "bg-[#ecfdf5] text-[#22c55e]",
    "bg-[#faf5ff] text-[#8b5cf6]",
    "bg-[#fdf2f8] text-[#ec4899]",
  ];

  return {
    text: serviceName.trim().slice(0, 1).toUpperCase() || "S",
    className: palette[index % palette.length],
  };
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "M월 d일", { locale: ko });
}

function formatDetailDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "yyyy. MM. dd", { locale: ko });
}

function getPaymentSubLabel(service: SubscriptionServiceSummary) {
  if (service.billingCycle === "YEARLY") {
    return "연간 결제";
  }

  if (service.billingCycle === "ONE_TIME") {
    return "1회 결제";
  }

  return `월 환산 ${formatCurrencyAmount(service.monthlyCostNormalized, "KRW")}`;
}

export function SubscriptionsManagementPage({
  members,
  userRole,
  workspaceName,
}: SubscriptionsManagementPageProps) {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const canDelete = userRole === "OWNER";
  const [services, setServices] = useState<SubscriptionServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [billingCycleFilter, setBillingCycleFilter] = useState("ALL");
  const [sort, setSort] = useState<SubscriptionSortValue>("NEXT_BILLING_ASC");
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_SUBSCRIPTION_FORM);
  const [initialForm, setInitialForm] = useState(DEFAULT_SUBSCRIPTION_FORM);
  const [detailLogs, setDetailLogs] = useState<SubscriptionServiceDetail["logs"]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<SubscriptionServiceDetail | null>(null);
  const [endingTarget, setEndingTarget] = useState<SubscriptionServiceSummary | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<SubscriptionServiceSummary | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    try {
      const response = await fetch("/api/subscriptions");
      if (!response.ok) {
        setPageError(
          await readListResponseError(
            response,
            "구독 서비스 목록을 불러오지 못했습니다."
          )
        );
        return;
      }

      const data = (await response.json()) as SubscriptionListResponse;
      setServices(data.services ?? []);
    } catch {
      setPageError("구독 서비스 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          services
            .map((service) => service.category)
            .filter((category): category is string => Boolean(category))
        )
      ),
    [services]
  );

  const managers = useMemo(
    () =>
      members
        .filter((member) => services.some((service) => service.managerUserId === member.userId))
        .map((member) => ({ value: member.userId, label: member.name })),
    [members, services]
  );

  const counts = useMemo(
    () => ({
      ALL: services.length,
      ACTIVE: services.filter((service) => service.status === "ACTIVE").length,
      REVIEW: services.filter((service) => service.status === "REVIEW").length,
      CANCEL_SCHEDULED: services.filter((service) => service.status === "CANCEL_SCHEDULED").length,
      ENDED: services.filter((service) => service.status === "ENDED").length,
    }),
    [services]
  );

  const summary = useMemo(() => {
    const visible = services.filter((service) => service.status !== "ENDED");
    const monthlyTotal = visible.reduce((sum, service) => sum + service.monthlyCostNormalized, 0);
    const annualTotal = visible.reduce((sum, service) => sum + service.annualCostNormalized, 0);
    const urgentCount = services.filter(
      (service) => service.alertLevel === "urgent" || service.alertLevel === "overdue"
    ).length;
    const currentMonth = new Date().getMonth();
    const dueThisMonth = services.filter((service) => {
      if (!service.nextBillingAt || service.status === "ENDED") return false;
      const date = new Date(service.nextBillingAt);
      return !Number.isNaN(date.getTime()) && date.getMonth() === currentMonth;
    }).length;

    return {
      monthlyTotal,
      annualTotal,
      urgentCount,
      dueThisMonth,
    };
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = services.filter((service) => {
      if (activeTab !== "ALL" && service.status !== activeTab) {
        return false;
      }
      if (categoryFilter !== "ALL" && service.category !== categoryFilter) {
        return false;
      }
      if (managerFilter !== "ALL" && service.managerUserId !== managerFilter) {
        return false;
      }
      if (billingCycleFilter !== "ALL" && service.billingCycle !== billingCycleFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      const haystack = [service.serviceName, service.managerName, service.purpose]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    return [...next].sort((left, right) => {
      if (sort === "COST_DESC") {
        return right.monthlyCostNormalized - left.monthlyCostNormalized;
      }
      if (sort === "CREATED_DESC") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
      if (sort === "UPDATED_DESC") {
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      }
      return new Date(left.nextBillingAt).getTime() - new Date(right.nextBillingAt).getTime();
    });
  }, [activeTab, billingCycleFilter, categoryFilter, managerFilter, search, services, sort]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services]
  );
  const openCreate = () => {
    setEditingServiceId(null);
    setForm(DEFAULT_SUBSCRIPTION_FORM);
    setInitialForm(DEFAULT_SUBSCRIPTION_FORM);
    setFormError(null);
    setDetailLogs([]);
    setSelectedServiceId(null);
    setSelectedServiceDetail(null);
    setFormOpen(true);
  };

  const openEdit = async (serviceId: string) => {
    setDetailLoading(true);
    setEditingServiceId(serviceId);

    try {
      const response = await fetch(`/api/subscriptions/${serviceId}`);
      if (!response.ok) {
        setPageError(await readResponseError(response, "서비스 상세 정보를 불러오지 못했습니다."));
        return;
      }

      const data = (await response.json()) as { service: SubscriptionServiceDetail };
      const nextForm = createSubscriptionFormState(data.service);
      setForm(nextForm);
      setInitialForm(nextForm);
      setDetailLogs(data.service.logs);
      setSelectedServiceDetail(data.service);
      setFormError(null);
      setFormOpen(true);
    } catch {
      setPageError("서비스 상세 정보를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = async (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedServiceDetail(null);

    try {
      const response = await fetch(`/api/subscriptions/${serviceId}`);
      if (!response.ok) {
        setPageError(await readResponseError(response, "서비스 상세 정보를 불러오지 못했습니다."));
        return;
      }

      const data = (await response.json()) as { service: SubscriptionServiceDetail };
      setSelectedServiceDetail(data.service);
    } catch {
      setPageError("서비스 상세 정보를 불러오지 못했습니다.");
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingServiceId(null);
    setForm(DEFAULT_SUBSCRIPTION_FORM);
    setInitialForm(DEFAULT_SUBSCRIPTION_FORM);
    setDetailLogs([]);
    setFormError(null);
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
      const response = await fetch(
        editingServiceId ? `/api/subscriptions/${editingServiceId}` : "/api/subscriptions",
        {
          method: editingServiceId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            billingAmount: Number(form.billingAmount),
            managerUserId: form.managerUserId || null,
            firstPaidAt: form.firstPaidAt || null,
          }),
        }
      );

      if (!response.ok) {
        setFormError(
          await readResponseError(
            response,
            editingServiceId ? "서비스 수정에 실패했습니다." : "서비스 등록에 실패했습니다."
          )
        );
        return;
      }

      setInfoMessage(editingServiceId ? "서비스 정보를 수정했습니다." : "서비스를 등록했습니다.");
      closeForm();
      await loadServices();
      if (selectedServiceId) {
        await openDetail(selectedServiceId);
      }
    } catch {
      setFormError(editingServiceId ? "서비스 수정에 실패했습니다." : "서비스 등록에 실패했습니다.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const runAction = async (targetId: string, action: "end" | "delete") => {
    setActionLoadingId(targetId);

    try {
      const response = await fetch(`/api/subscriptions/${targetId}${action === "end" ? "/end" : ""}`, {
        method: action === "end" ? "POST" : "DELETE",
      });

      if (!response.ok) {
        setPageError(
          await readResponseError(
            response,
            action === "end" ? "종료 처리에 실패했습니다." : "삭제에 실패했습니다."
          )
        );
        return;
      }

      setInfoMessage(action === "end" ? "서비스를 종료 처리했습니다." : "서비스를 삭제했습니다.");
      setEndingTarget(null);
      setDeletingTarget(null);
      if (selectedServiceId === targetId) {
        setSelectedServiceId(null);
        setSelectedServiceDetail(null);
      }
      await loadServices();
    } catch {
      setPageError(action === "end" ? "종료 처리에 실패했습니다." : "삭제에 실패했습니다.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!canManage) {
    return (
      <div className="page-shell">
        <section className="rounded-[20px] border border-[var(--border)] bg-white px-6 py-8 shadow-[var(--shadow-sm)]">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">구독 서비스 관리</h1>
          <p className="mt-3 text-[15px] leading-7 text-[var(--text-secondary)]">
            구독 서비스 관리는 owner 또는 admin 권한에서만 확인할 수 있습니다.
          </p>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <h1 className="page-title">구독 서비스 관리</h1>
            <p className="page-subtitle">회사가 사용 중인 유료 서비스를 한 곳에서 확인하고 관리하세요.</p>
          </div>
          <button type="button" className="primary-button" onClick={openCreate}>
            + 서비스 등록
          </button>
        </section>

        {pageError ? (
          <div className="mb-4 rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
            {pageError}
          </div>
        ) : null}
        {infoMessage ? (
          <div className="mb-4 rounded-2xl border border-[#bbf7d0] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
            {infoMessage}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-4">
          <SummaryCard label="사용 중 서비스" value={`${counts.ACTIVE}`} sub={`검토 중 ${counts.REVIEW}개 포함`} />
          <SummaryCard label="월 고정 비용" value={formatCurrencyAmount(summary.monthlyTotal, "KRW")} sub={`${workspaceName} 기준 예상 비용`} />
          <SummaryCard label="연 환산 비용" value={formatCurrencyAmount(summary.annualTotal, "KRW")} sub="결제 주기별 환산 기준" />
          <SummaryCard
            label="이번 달 결제 예정"
            value={`${summary.dueThisMonth}건`}
            sub={
              summary.urgentCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--danger-light)] px-2.5 py-1 text-xs font-semibold text-[var(--danger)]">
                  <TriangleAlert size={12} />
                  3일 이내 {summary.urgentCount}건
                </span>
              ) : (
                "이번 달 급한 결제는 없어요"
              )
            }
          />
        </div>

        <FilterChipGroup
          aria-label="구독 서비스 상태 필터"
          className="mt-8"
          items={STATUS_FILTER_ITEMS.map((item) => ({ ...item, count: counts[item.value] }))}
          activeValue={activeTab}
          onChange={setActiveTab}
        />

        <section className="mt-5 rounded-[18px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center gap-3 whitespace-nowrap shrink-0">
            <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <Search size={18} className="text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="서비스명, 담당자, 사용 목적 검색..."
              />
            </div>

            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="form-select min-w-[180px]">
              <option value="ALL">카테고리 전체</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select value={managerFilter} onChange={(event) => setManagerFilter(event.target.value)} className="form-select min-w-[160px]">
              <option value="ALL">담당자 전체</option>
              {managers.map((manager) => (
                <option key={manager.value} value={manager.value}>
                  {manager.label}
                </option>
              ))}
            </select>

            <select value={billingCycleFilter} onChange={(event) => setBillingCycleFilter(event.target.value)} className="form-select min-w-[160px]">
              <option value="ALL">결제 주기 전체</option>
              {SUBSCRIPTION_BILLING_CYCLE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {BILLING_CYCLE_LABELS[value]}
                </option>
              ))}
            </select>

            <div className="hidden h-6 w-px bg-[var(--border)] xl:block" />

            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-muted)]">정렬:</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SubscriptionSortValue)} className="form-select min-w-[170px]">
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
        <div className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-sm)]">
          <table className="w-full border-collapse">
            <thead className="bg-[var(--surface-2)] text-left text-sm font-semibold text-[var(--text-muted)]">
              <tr>
                <th className="px-6 py-4">서비스</th>
                <th className="px-5 py-4">상태</th>
                <th className="px-5 py-4">카테고리</th>
                <th className="px-5 py-4">결제 주기</th>
                <th className="px-5 py-4">다음 결제일</th>
                <th className="px-5 py-4 text-right">결제 금액</th>
                <th className="px-5 py-4 text-right">월 환산</th>
                <th className="px-5 py-4">담당자</th>
                <th className="px-5 py-4 text-right" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-sm text-[var(--text-muted)]">
                    구독 서비스 목록을 불러오는 중입니다.
                  </td>
                </tr>
              ) : null}
              {!loading && filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-sm text-[var(--text-muted)]">
                    조건에 맞는 서비스가 없습니다.
                  </td>
                </tr>
              ) : null}
              {!loading
                ? filteredServices.map((service, index) => {
                    const glyph = getServiceGlyph(service.serviceName, index);
                    const alert = getAlertBadge(service.alertLevel);

                    return (
                      <tr
                        key={service.id}
                        className={`cursor-pointer border-t border-[var(--border-light)] transition hover:bg-[var(--surface-2)] ${service.status === "ENDED" ? "opacity-55" : ""}`}
                        onClick={() => void openDetail(service.id)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] border border-[var(--border-light)] text-base font-bold ${glyph.className}`}>
                              {glyph.text}
                            </div>
                            <div>
                              <div className="text-[17px] font-semibold text-[var(--text-primary)]">
                                {service.serviceName}
                              </div>
                              <div className="mt-1 text-sm text-[var(--text-muted)]">
                                {service.planName || service.category || "플랜 정보 없음"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-5">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusBadgeClass(service.status)}`}>
                            <span className="h-2 w-2 rounded-full bg-current" />
                            {STATUS_LABELS[service.status]}
                          </span>
                        </td>
                        <td className="px-5 py-5">
                          <span className="rounded-full bg-[var(--surface-3)] px-3 py-1.5 text-sm font-semibold text-[var(--text-muted)]">
                            {service.category || "기타"}
                          </span>
                        </td>
                        <td className="px-5 py-5 text-[17px] font-semibold text-[var(--text-primary)]">
                          {BILLING_CYCLE_LABELS[service.billingCycle]}
                        </td>
                        <td className="px-5 py-5">
                          <div className="text-[17px] font-semibold text-[var(--text-primary)]">
                            {formatDisplayDate(service.nextBillingAt)}
                          </div>
                          {service.alertLevel !== "normal" ? (
                            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${alert.className}`}>
                              {alert.label}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-5 text-right">
                          <div className="text-[17px] font-semibold text-[var(--text-primary)]">
                            {formatCurrencyAmount(service.billingAmount, service.currency)}
                          </div>
                          <div className="mt-1 text-sm text-[var(--text-muted)]">
                            {getPaymentSubLabel(service)}
                          </div>
                        </td>
                        <td className="px-5 py-5 text-right">
                          <div className="text-[17px] font-semibold text-[var(--text-primary)]">
                            {formatCurrencyAmount(service.monthlyCostNormalized, "KRW")}
                          </div>
                        </td>
                        <td className="px-5 py-5">
                          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)]">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                              {(service.managerName ?? "미").slice(0, 1)}
                            </span>
                            {service.managerName ?? "미정"}
                          </span>
                        </td>
                        <td className="px-5 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="icon-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openEdit(service.id);
                              }}
                              aria-label="서비스 수정"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openDetail(service.id);
                              }}
                              aria-label="서비스 상세"
                            >
                              <Ellipsis size={15} />
                            </button>
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

      {selectedService ? (
        <SubscriptionDetailPanel
          item={selectedServiceDetail ?? selectedService}
          loading={!selectedServiceDetail}
          canDelete={canDelete}
          onClose={() => {
            setSelectedServiceId(null);
            setSelectedServiceDetail(null);
          }}
          onEdit={() => {
            if (selectedService) {
              void openEdit(selectedService.id);
            }
          }}
          onEnd={() => setEndingTarget(selectedService)}
          onDelete={() => setDeletingTarget(selectedService)}
        />
      ) : null}

      <SubscriptionsFormDialog
        open={formOpen}
        editingServiceId={editingServiceId}
        loading={detailLoading && Boolean(editingServiceId)}
        submitting={formSubmitting}
        error={formError}
        form={form}
        initialForm={initialForm}
        logs={detailLogs}
        members={members}
        onClose={closeForm}
        onSubmit={() => void submitForm()}
        onChange={(updater) => setForm((current) => updater(current))}
      />

      <SubscriptionsConfirmDialog
        open={Boolean(endingTarget)}
        title="서비스를 종료 처리할까요?"
        description="삭제 대신 종료 처리로 남기면 이력은 계속 확인할 수 있습니다."
        confirmLabel="종료 처리"
        loading={actionLoadingId === endingTarget?.id}
        onClose={() => setEndingTarget(null)}
        onConfirm={() => endingTarget && void runAction(endingTarget.id, "end")}
      />

      <SubscriptionsConfirmDialog
        open={Boolean(deletingTarget)}
        title="서비스를 삭제할까요?"
        description="삭제는 owner만 할 수 있고, 종료 처리보다 더 강한 조치입니다."
        confirmLabel="삭제"
        confirmTone="danger"
        loading={actionLoadingId === deletingTarget?.id}
        onClose={() => setDeletingTarget(null)}
        onConfirm={() => deletingTarget && void runAction(deletingTarget.id, "delete")}
      />
    </>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border-light)] bg-white px-6 py-6 shadow-[var(--shadow-sm)]">
      <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
      <div className="mt-3 text-[24px] font-bold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-3 text-sm text-[var(--text-muted)]">{sub}</div>
    </article>
  );
}

function SubscriptionDetailPanel({
  item,
  loading,
  canDelete,
  onClose,
  onEdit,
  onEnd,
  onDelete,
}: {
  item: SubscriptionServiceSummary | SubscriptionServiceDetail;
  loading: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
  onEnd: () => void;
  onDelete: () => void;
}) {
  const glyph = getServiceGlyph(item.serviceName, 0);
  const alert = getAlertBadge(item.alertLevel);
  const detailItem = item as SubscriptionServiceDetail;
  const safeWebsiteUrl = getSafeSubscriptionWebsiteUrl(item.websiteUrl);

  return (
    <div className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-[420px] flex-col border-l border-[var(--border)] bg-white shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="text-sm font-semibold text-[var(--text-primary)]">서비스 상세</div>
        <div className="flex items-center gap-2">
          <button type="button" className="secondary-button btn--sm" onClick={onEdit}>
            수정
          </button>
          <button type="button" className="icon-button" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="custom-scroll flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            상세 정보를 불러오는 중입니다.
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] border border-[var(--border-light)] text-lg font-bold ${glyph.className}`}>
                {glyph.text}
              </div>
              <div>
                <div className="text-[22px] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  {item.serviceName}
                </div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  {item.planName || "플랜 정보 없음"}
                </div>
                {item.websiteUrl ? (
                  safeWebsiteUrl ? (
                    <a
                      href={safeWebsiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
                    >
                      {item.websiteUrl.replace(/^https?:\/\//, "")}
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <p className="mt-2 break-all text-sm text-[var(--text-muted)]">
                      {item.websiteUrl}
                    </p>
                  )
                ) : null}
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusBadgeClass(item.status)}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {STATUS_LABELS[item.status]}
              </span>
              <span className="rounded-full bg-[var(--surface-3)] px-3 py-1.5 text-sm font-semibold text-[var(--text-muted)]">
                {item.category || "기타"}
              </span>
              {item.alertLevel !== "normal" ? (
                <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${alert.className}`}>
                  {alert.label}
                </span>
              ) : null}
            </div>

            <DetailSection title="결제 정보">
              <DetailRow label="결제 금액" value={formatCurrencyAmount(item.billingAmount, item.currency)} highlight />
              <DetailRow label="월 환산" value={formatCurrencyAmount(item.monthlyCostNormalized, "KRW")} />
              <DetailRow label="연 환산" value={formatCurrencyAmount(item.annualCostNormalized, "KRW")} />
              <DetailRow label="결제 주기" value={BILLING_CYCLE_LABELS[item.billingCycle]} />
              <DetailRow label="다음 결제일" value={formatDetailDate(item.nextBillingAt)} />
              <DetailRow label="첫 결제일" value={formatDetailDate(item.firstPaidAt)} />
            </DetailSection>

            <DetailSection title="운영 정보">
              <DetailRow label="담당자" value={item.managerName || "미정"} />
              <DetailRow label="팀" value={item.teamName || "전체"} />
              <DetailRow label="사용 목적" value={item.purpose || "기록 없음"} />
              <DetailRow label="해지 방법" value={item.cancellationMethod || "기록 없음"} />
              <DetailRow label="메모" value={item.memo || "기록 없음"} />
            </DetailSection>

            {"logs" in detailItem ? (
              <DetailSection title="변경 이력">
                {detailItem.logs.length === 0 ? (
                  <div className="text-sm text-[var(--text-muted)]">변경 이력이 없습니다.</div>
                ) : (
                  <div className="space-y-3">
                    {detailItem.logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 border-b border-[var(--border-light)] pb-3 last:border-b-0">
                        <span className="mt-1 h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                        <div>
                          <div className="text-sm leading-6 text-[var(--text-secondary)]">
                            {log.actorName}님이 변경했습니다.
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {format(new Date(log.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DetailSection>
            ) : null}

            <div className="mt-8 border-t border-[var(--border)] pt-5">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--danger)]">상태 변경</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.status !== "ENDED" ? (
                  <button type="button" className="secondary-button btn--sm !text-[var(--warning)]" onClick={onEnd}>
                    종료 처리
                  </button>
                ) : null}
                {canDelete ? (
                  <button type="button" className="danger-button btn--sm" onClick={onDelete}>
                    삭제
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
                삭제보다 종료 처리를 우선 사용하면 이력은 계속 확인할 수 있습니다.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-light)] py-2 last:border-b-0">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className={`text-right text-sm ${highlight ? "font-bold text-[var(--accent)]" : "font-medium text-[var(--text-primary)]"}`}>
        {value}
      </span>
    </div>
  );
}
