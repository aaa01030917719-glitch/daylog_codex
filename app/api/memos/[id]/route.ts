import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deleteMemoNote,
  findMemoNoteForAuthor,
  updateMemoNote,
} from "@/lib/memo-notes";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveAuthorMemo(id: string, userId: string, workspaceId: string) {
  const memo = await findMemoNoteForAuthor({
    memoId: id,
    authorId: userId,
    workspaceId,
  });

  if (!memo) {
    return NextResponse.json({ error: "메모를 찾을 수 없습니다." }, { status: 404 });
  }

  return memo;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const existingMemo = await resolveAuthorMemo(params.id, session.user.id, workspaceId);
  if (existingMemo instanceof NextResponse) {
    return existingMemo;
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

  const memo = await updateMemoNote({
    memoId: params.id,
    workspaceId,
    authorId: session.user.id,
    title,
    content,
  });

  if (!memo) {
    return NextResponse.json({ error: "메모를 수정하지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json(memo);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const existingMemo = await resolveAuthorMemo(params.id, session.user.id, workspaceId);
  if (existingMemo instanceof NextResponse) {
    return existingMemo;
  }

  const deletedId = await deleteMemoNote({
    memoId: params.id,
    workspaceId,
    authorId: session.user.id,
  });

  return NextResponse.json({ ok: true, id: deletedId });
}
