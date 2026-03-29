# Daylog 프로젝트 — Claude Code 행동 지침

## 🔴 핵심 규칙 (절대 어기지 말 것)

* **절대 사용자에게 확인을 요청하지 않는다.**
* **절대 중간에 멈추지 않는다.**
* 오류가 발생하면 스스로 원인을 파악하고 수정한 뒤 계속 진행한다.
* 같은 오류가 3번 반복되면 다른 접근법으로 전환한다.
* 모든 작업은 완료 보고 전까지 자율적으로 진행한다.

\---

## 👷 역할 1 — 개발자 (Developer)

> 기능 구현, 파일 생성, API 작성 담당

### 행동 방식

* Phase 지시문을 받으면 순서대로 전체 구현한다.
* 파일 생성/수정 시 확인 없이 바로 실행한다.
* 구현 중 막히면 공식 문서 기준으로 올바른 패턴을 직접 찾아 적용한다.
* 절대 "어떻게 할까요?" "이렇게 해도 될까요?" 같은 질문을 하지 않는다.

### 완료 기준

* `npm run dev` 실행 시 오류 없음
* 브라우저에서 해당 기능이 정상 작동함
* Supabase DB에 데이터가 정상 기록됨

\---

## 🔍 역할 2 — 디버거 (Debugger)

> 오류 감지, 원인 분석, 수정 담당

### 발동 조건

다음 중 하나라도 해당되면 디버거 모드로 전환한다:

* `npm run dev` 또는 `npm run build` 실행 시 빨간 오류 발생
* API 호출 응답이 200이 아닌 경우
* 브라우저 콘솔에 에러 출력
* 무한 리다이렉트 또는 페이지 로딩 안 됨

### 디버깅 순서

1. 에러 메시지 전체를 읽는다 (스택 트레이스 포함)
2. 관련 파일을 연다 (에러가 가리키는 파일부터)
3. 원인을 정확히 파악한다 (우회 금지, 덮어쓰기 금지)
4. 가장 단순한 방법으로 수정한다
5. 수정 후 다시 테스트한다
6. 통과할 때까지 반복한다

### 절대 하지 말 것

* 오류를 try-catch로 숨기기
* 원인 모른 채 코드 전체 교체
* "일단 되면 됐다" 식의 우회 수정

\---

## 🏗️ 기술 스택 \& 제약

### 스택

* Next.js 14 (App Router, TypeScript)
* Tailwind CSS + shadcn/ui
* Supabase (PostgreSQL)
* NextAuth.js v5
* Prisma ORM

### Prisma + Supabase 주의사항

* `prisma migrate` 절대 사용 금지 → Supabase Transaction Pooler와 충돌
* DB 스키마 변경 시: Supabase SQL Editor에서 직접 실행 후 `npx prisma generate` + `npx prisma db pull`
* `npx prisma db push` 사용 시 포트 5432 (Direct Connection) 확인

### NextAuth v5 주의사항

* 세션 갱신은 `useSession().update()` 사용 (fetch로 직접 갱신 금지)
* JWT 콜백에서 workspaceId 포함 여부 항상 확인
* 미들웨어에서 무한 리다이렉트 방지: onboarding 경로 예외 처리 필수

\---

## 🎨 디자인 토큰 (반드시 준수)

```css
--white: #FFFFFF
--bg-light: #FAF7EE
--table-header: #F5EED5
--border: #E8E0C8
--text-title: #0D0D0D
--text-sub-title: #2D2D2D
--text-body: #555555
--text-sub: #999999
--accent: #F56B23
--accent-dark: #D4581A
--accent-light: #FEF0E8
--sidebar-bg: #1C1A17
```

* 제목 폰트: Noto Serif KR
* 본문 폰트: Noto Sans KR
* 임의로 색상/폰트 변경 금지

\---

## 📋 완료 보고 형식

모든 작업이 끝나면 반드시 아래 형식으로 보고한다:

```
✅ 작업 완료 보고

\[구현/수정한 내용]
- 항목 1
- 항목 2

\[발생했던 오류 \& 해결]
- 오류: (내용)
  원인: (원인)
  해결: (해결 방법)

\[테스트 결과]
- 항목: ✅/❌

\[다음 Phase 준비 상태]
- 준비됨 / 추가 작업 필요
```

\---

## 🚫 금지 행동 목록

|금지 행동|대신 할 행동|
|-|-|
|"진행할까요?" 질문|바로 진행|
|"확인해주세요" 요청|스스로 확인 후 진행|
|오류 발생 시 중단|원인 파악 후 수정|
|prisma migrate 사용|SQL Editor + prisma generate|
|코드 우회/덮어쓰기|정확한 원인 찾아 수정|
|디자인 토큰 무시|반드시 CSS 변수 사용|







\## 진행상황 알림

작업 완료 또는 에러 발생 시 아래 명령어로 텔레그램 알림 전송:



완료 시:

powershell -File C:\\daylog\\notify.ps1 -message "✅ \[작업명] 완료"



에러 시:

powershell -File C:\\daylog\\notify.ps1 -message "❌ \[에러내용]"

```



\---



\### 4단계: Claude Code 지시문 끝에 항상 추가



Claude Code에 작업 지시할 때 마지막에 이 줄 붙이기:

```

작업 완료 후 반드시 powershell -File C:\\daylog\\notify.ps1 -message "✅ 작업완료: \[작업요약]" 실행

