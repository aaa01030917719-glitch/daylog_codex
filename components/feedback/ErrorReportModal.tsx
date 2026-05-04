"use client";

import { useEffect, useRef, useState } from "react";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";

interface ErrorReportModalProps {
  open: boolean;
  currentPath?: string;
  onClose: () => void;
}

const FALLBACK_ERROR = "\uC624\uB958 \uC81C\uBCF4\uB97C \uBCF4\uB0B4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const SUCCESS_MESSAGE = "\uC624\uB958 \uC81C\uBCF4\uB97C \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4.";

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (data?.error && typeof data.error === "string") {
      return data.error;
    }
  } catch {
    return FALLBACK_ERROR;
  }

  return FALLBACK_ERROR;
}

export function ErrorReportModal({
  open,
  currentPath,
  onClose,
}: ErrorReportModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { requestClose } = useDirtyLeaveGuard({
    isDirty: open && !success && message.trim().length > 0,
    onDiscard: onClose,
    disabled: submitting || !open,
  });

  useEffect(() => {
    if (!open) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setMessage("");
      setError(null);
      setSuccess(false);
      setSubmitting(false);
      setIsVisible(false);
      return;
    }

    setIsVisible(false);
    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 120);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  async function submitReport() {
    const trimmed = message.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const [response] = await Promise.all([
        fetch("/api/error-reports", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmed,
            currentPath,
          }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 600)),
      ]);

      if (!response.ok) {
        setError(await parseErrorMessage(response));
        return;
      }

      setMessage("");
      setSuccess(true);
      closeTimerRef.current = window.setTimeout(() => {
        onClose();
      }, 1800);
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitReport();
  }

  return (
    <div className="modal-shell" onClick={requestClose}>
      <div
        className={`modal-overlay transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`modal-card max-w-[420px] transition-all duration-200 ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-95 opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{"\uC624\uB958 \uBCF4\uB0B4\uAE30"}</h2>
            <p className="modal-subtitle">{"\uC9E7\uAC8C \uC801\uC5B4\uC8FC\uC2DC\uBA74 \uBE60\uB974\uAC8C \uD655\uC778\uD558\uACA0\uC2B5\uB2C8\uB2E4."}</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="icon-button"
            aria-label={"\uC624\uB958 \uC81C\uBCF4 \uBAA8\uB2EC \uB2EB\uAE30"}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {success ? (
            <div className="modal-body">
              <div className="rounded-[var(--radius)] border border-[var(--success-light)] bg-[var(--success-light)]/50 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[var(--success)]">{SUCCESS_MESSAGE}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {"\uC7A0\uC2DC \uD6C4 \uC790\uB3D9\uC73C\uB85C \uB2EB\uD799\uB2C8\uB2E4."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="modal-body space-y-3">
                <div className="field">
                  <label className="field-label" htmlFor="error-report-message">
                    {"\uB0B4\uC6A9"}
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="error-report-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="form-textarea min-h-[56px] resize-y"
                    placeholder={"\uC5B4\uB5A4 \uC624\uB958\uAC00 \uC788\uC5C8\uB294\uC9C0 \uC9E7\uAC8C \uC801\uC5B4\uC8FC\uC138\uC694"}
                    maxLength={1000}
                    disabled={submitting}
                    rows={2}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        event.preventDefault();
                        void submitReport();
                      }
                    }}
                  />
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  {"\uAC1C\uBC1C\uC790\uC5D0\uAC8C \uC624\uB958 \uBCF4\uACE0\uAC00 \uC804\uC1A1\uB429\uB2C8\uB2E4."}
                </p>

                {error ? (
                  <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
                ) : null}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={requestClose}
                  className="secondary-button"
                  disabled={submitting}
                >
                  {"\uB2EB\uAE30"}
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting || !message.trim()}
                >
                  {submitting ? "\uBCF4\uB0B4\uB294 \uC911..." : "\uBCF4\uB0B4\uAE30"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
