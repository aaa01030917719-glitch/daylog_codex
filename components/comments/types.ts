export type CommentTargetType = "document" | "project" | "idea" | "notice" | "delivery";

export interface DetailCommentAuthor {
  id: string;
  name: string;
  image: string | null;
  role: string | null;
}

export interface DetailCommentItem {
  id: string;
  content: string;
  authorId: string;
  targetType: CommentTargetType;
  targetId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: DetailCommentAuthor;
  canManage: boolean;
  replies: DetailCommentItem[];
}
