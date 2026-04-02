export type IdeaVisibility = "SHARED" | "PRIVATE";
export type IdeasTab = "ALL" | "SHARED" | "PRIVATE";

export interface IdeaPostSummary {
  id: string;
  title: string;
  content: string;
  visibility: IdeaVisibility;
  authorId: string;
  authorName: string;
  canManage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IdeaPostPayload {
  title: string;
  content: string;
  visibility: IdeaVisibility;
}
