"use client";

import { useEffect, useState } from "react";

export function CheckOutPopup() {
  const [hasCheckIn, setHasCheckIn] = useState(false);
  const [hasCheckOut, setHasCheckOut] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/attendance/today")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setHasCheckIn(d.hasCheckIn);
          setHasCheckOut(d.hasCheckOut);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const shouldShow = ready && hasCheckIn && !hasCheckOut;

  useEffect(() => {
    if (!shouldShow) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "퇴근 처리를 하지 않으셨습니다. 퇴근하시겠습니까?";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldShow]);

  async function handleCheckOut() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/check-out", { method: "POST" });
      if (res.ok) {
        setHasCheckOut(true);
        setShowConfirm(false);
      }
    } catch (err) {
      console.error("[CHECK-OUT]", err);
    } finally {
      setLoading(false);
    }
  }

  if (!shouldShow) return null;

  return (
    <>
      {/* Floating checkout button */}
      <div
        style={{
          position: "fixed",
          bottom: "5rem",
          right: "1.5rem",
          zIndex: 40,
        }}
      >
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            background: "#F56B23",
            color: "#fff",
            border: "none",
            borderRadius: "9999px",
            padding: "0.75rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(245,107,35,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          🏃 퇴근하기
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              maxWidth: "20rem",
              width: "calc(100% - 2rem)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.5rem" }}>
              퇴근하시겠습니까?
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1.25rem" }}>
              현재 시간으로 퇴근 처리됩니다.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.5rem",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "#555",
                }}
              >
                취소
              </button>
              <button
                onClick={handleCheckOut}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  border: "none",
                  borderRadius: "0.5rem",
                  background: "#F56B23",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "처리 중..." : "퇴근하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
