"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAF7EE",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</p>
      <h1
        style={{
          fontFamily: "Noto Serif KR, serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#0D0D0D",
          marginBottom: "0.5rem",
        }}
      >
        문제가 발생했어요
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1.5rem" }}>
        일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      <button
        onClick={reset}
        style={{
          background: "#F56B23",
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          padding: "0.625rem 1.5rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
