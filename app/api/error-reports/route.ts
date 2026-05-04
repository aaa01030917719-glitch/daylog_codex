import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function normalizeMessage(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePath(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const message = normalizeMessage(body.message);
    const currentPath = normalizePath(body.currentPath);

    if (!message) {
      return NextResponse.json({ error: "오류 내용을 입력해 주세요." }, { status: 400 });
    }

    const report = await prisma.errorReport.create({
      data: {
        message,
        currentPath,
        userId: session.user.id,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        id: report.id,
        createdAt: report.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ERROR_REPORT_CREATE]", error);
    return NextResponse.json(
      { error: "오류 제보를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
