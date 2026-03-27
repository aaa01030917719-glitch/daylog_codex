import { NextResponse } from "next/server";
import { auth } from "@/auth";

// JWT 쿠키를 강제 갱신하는 엔드포인트
// auth()를 호출하면 jwt 콜백이 실행되어 workspaceId를 재조회하고 쿠키를 갱신함
export async function GET() {
  try {
    const session = await auth();
    return NextResponse.json({
      ok: true,
      hasWorkspace: !!session?.user?.workspaceId,
      workspaceId: session?.user?.workspaceId ?? null,
    });
  } catch (err) {
    console.error("[AUTH REFRESH]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
