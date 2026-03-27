import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const { to, templateId, variables } = await req.json();

    // solapi SDK를 통한 카카오 알림톡 발송
    // 실제 구현 시 solapi SDK 초기화 및 발송 로직 추가
    // const solapi = new Solapi(process.env.SOLAPI_API_KEY!, process.env.SOLAPI_API_SECRET!)
    // await solapi.sendKakaoAlimtalk({ to, pfId: process.env.SOLAPI_KAKAO_PFID!, templateId, variables })

    console.log("[KAKAO ALIMTALK]", { to, templateId, variables });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[KAKAO]", error);
    return NextResponse.json({ error: "알림톡 발송에 실패했습니다." }, { status: 500 });
  }
}
