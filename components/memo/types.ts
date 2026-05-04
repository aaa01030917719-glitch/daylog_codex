export type MemoColor = "yellow" | "blue" | "green" | "pink" | "purple" | "white";

export const MEMO_COLOR_ORDER: MemoColor[] = [
  "yellow",
  "blue",
  "green",
  "pink",
  "purple",
  "white",
];

export const MEMO_COLORS: Record<MemoColor, { bg: string; border: string }> = {
  yellow: { bg: "#fefce8", border: "#fef08a" },
  blue: { bg: "#eff6ff", border: "#bfdbfe" },
  green: { bg: "#f0fdf4", border: "#bbf7d0" },
  pink: { bg: "#fff1f2", border: "#fecdd3" },
  purple: { bg: "#faf5ff", border: "#e9d5ff" },
  white: { bg: "#ffffff", border: "#e5e7eb" },
};

export interface MemoNoteSummary {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  color?: MemoColor;
}

export interface MemoNotePayload {
  title: string;
  content: string;
  color?: MemoColor;
}
