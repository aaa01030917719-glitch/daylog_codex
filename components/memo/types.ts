export interface MemoNoteSummary {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoNotePayload {
  title: string;
  content: string;
}
