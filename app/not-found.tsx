import Link from "next/link";

export default function NotFoundPage() {
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
      <p style={{ fontSize: "4rem", fontWeight: 700, color: "#E8E0C8", marginBottom: "0.5rem" }}>
        404
      </p>
      <h1
        style={{
          fontFamily: "Noto Serif KR, serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#0D0D0D",
          marginBottom: "0.5rem",
        }}
      >
        페이지를 찾을 수 없어요
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1.5rem" }}>
        요청하신 페이지가 존재하지 않거나 이동되었어요.
      </p>
      <Link
        href="/"
        style={{
          background: "#F56B23",
          color: "#fff",
          borderRadius: "0.5rem",
          padding: "0.625rem 1.5rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
