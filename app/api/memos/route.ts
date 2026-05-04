import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createMemoNote, listMemoNotes } from "@/lib/memo-notes";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );

  if (!workspaceId) {
    return NextResponse.json({ memos: [] });
  }

  const memos = await listMemoNotes(workspaceId, session.user.id);
  return NextResponse.json({ memos });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );

  if (!workspaceId) {
    return NextResponse.json(
      { error: "워크스페이스를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const title = normalizeText(body.title);
  const content = normalizeText(body.content);

  if (!title) {
    return NextResponse.json({ error: "메모 제목을 입력해 주세요." }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "메모 내용을 입력해 주세요." }, { status: 400 });
  }

  const memo = await createMemoNote({
    workspaceId,
    authorId: session.user.id,
    title,
    content,
  });

  if (!memo) {
    return NextResponse.json({ error: "메모를 저장하지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json(memo, { status: 201 });
}
