import {
  findSensitiveSubscriptionInput,
  formatDateInputValue,
  type SubscriptionBillingCycleValue,
  type SubscriptionServiceDetail,
  type SubscriptionServiceStatusValue,
  type SubscriptionServiceSummary,
} from "@/lib/subscription-services";

export type SubscriptionFormState = {
  serviceName: string;
  websiteUrl: string;
  category: string;
  planName: string;
  billingAmount: string;
  currency: string;
  billingCycle: SubscriptionBillingCycleValue;
  firstPaidAt: string;
  nextBillingAt: string;
  managerUserId: string;
  teamName: string;
  purpose: string;
  status: SubscriptionServiceStatusValue;
  cancellationMethod: string;
  memo: string;
};

export const DEFAULT_SUBSCRIPTION_FORM: SubscriptionFormState = {
  serviceName: "",
  websiteUrl: "",
  category: "",
  planName: "",
  billingAmount: "",
  currency: "KRW",
  billingCycle: "MONTHLY",
  firstPaidAt: "",
  nextBillingAt: formatDateInputValue(new Date()),
  managerUserId: "",
  teamName: "",
  purpose: "",
  status: "REVIEW",
  cancellationMethod: "",
  memo: "",
};

export function createSubscriptionFormState(
  service: SubscriptionServiceSummary | SubscriptionServiceDetail | null
): SubscriptionFormState {
  if (!service) {
    return DEFAULT_SUBSCRIPTION_FORM;
  }

  return {
    serviceName: service.serviceName,
    websiteUrl: service.websiteUrl ?? "",
    category: service.category ?? "",
    planName: service.planName ?? "",
    billingAmount: `${service.billingAmount}`,
    currency: service.currency,
    billingCycle: service.billingCycle,
    firstPaidAt: formatDateInputValue(service.firstPaidAt),
    nextBillingAt: formatDateInputValue(service.nextBillingAt),
    managerUserId: service.managerUserId ?? "",
    teamName: service.teamName ?? "",
    purpose: service.purpose ?? "",
    status: service.status,
    cancellationMethod: service.cancellationMethod ?? "",
    memo: service.memo ?? "",
  };
}

export function validateSubscriptionForm(form: SubscriptionFormState) {
  if (!form.serviceName.trim()) {
    return "서비스명을 입력해주세요.";
  }

  if (!form.billingAmount.trim() || Number(form.billingAmount) <= 0) {
    return "결제 금액을 입력해주세요.";
  }

  if (!form.currency.trim()) {
    return "통화를 입력해주세요.";
  }

  if (!form.billingCycle) {
    return "결제 주기를 선택해주세요.";
  }

  if (!form.nextBillingAt) {
    return "다음 결제일을 선택해주세요.";
  }

  if (!form.status) {
    return "상태를 선택해주세요.";
  }

  const sensitiveKeyword = findSensitiveSubscriptionInput({
    purpose: form.purpose,
    cancellationMethod: form.cancellationMethod,
    memo: form.memo,
  });

  if (sensitiveKeyword) {
    return "민감한 인증정보나 결제수단 정보는 저장할 수 없습니다. 메모와 종료 방법을 다시 확인해주세요.";
  }

  return null;
}

export function formatCurrencyAmount(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString("ko-KR")} ${currency}`;
  }
}

export function readResponseError(response: Response, fallback: string) {
  return response
    .json()
    .then((data) => {
      if (
        typeof data === "object" &&
        data &&
        "error" in data &&
        typeof data.error === "string"
      ) {
        return data.error;
      }

      return fallback;
    })
    .catch(() => fallback);
}

export function readListResponseError(response: Response, fallback: string) {
  const genericMessage = fallback.includes("잠시 후 다시 시도해주세요.")
    ? fallback
    : `${fallback} 잠시 후 다시 시도해주세요.`;

  return response
    .json()
    .then((data) => {
      if (
        typeof data === "object" &&
        data &&
        "error" in data &&
        typeof data.error === "string"
      ) {
        const error = data.error.trim();
        if (
          response.status === 400 ||
          error.includes("웹사이트 주소 형식") ||
          error.includes("서비스명을 입력") ||
          error.includes("결제 금액") ||
          error.includes("결제 주기") ||
          error.includes("다음 결제일") ||
          error.includes("상태를 선택")
        ) {
          return genericMessage;
        }
      }

      return genericMessage;
    })
    .catch(() => genericMessage);
}

export function getSafeSubscriptionWebsiteUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
