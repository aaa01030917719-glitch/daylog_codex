# Auth Flow 디버깅 로그 (2026-03-28)

## 테스트 환경
- Next.js 14.2.35 (App Router)
- NextAuth v5 (next-auth)
- Prisma 7.5.0 + @prisma/adapter-pg
- Supabase PostgreSQL (Transaction Pooler)

---

## 발견한 실수 / 혼란 포인트

### 1. Register API 경로 착각
**실수**: 테스트 시 `/api/auth/register`로 호출 시도 (404)
**실제 경로**: `/api/register`
**원인**: 파일 구조를 먼저 확인하지 않고 가정함
**교훈**: curl 테스트 전 `Glob("app/api/**")` 으로 실제 경로 먼저 확인할 것

---

### 2. curl 한국어 인코딩 오류 (500 반환)
**오류**: `SyntaxError: Bad escaped character in JSON at position 66`
**원인**: Git Bash (Windows)에서 curl 명령에 한국어 문자 포함 시 인코딩 문제 발생
**재현**: `curl -d '{"name":"테스트유저","email":"..."}` → 500
**해결**: ASCII 문자만 사용하거나 JSON 파일을 별도로 작성해서 `curl -d @body.json` 으로 전달
**중요**: 실제 앱 내에서 `JSON.stringify()` 를 사용하면 정상 동작함. 앱 자체 버그 아님

---

### 3. .env vs .env.local 비밀번호 불일치
**상황**: `.env`의 DATABASE_URL 비밀번호가 잘못되어 있음
- `.env` → `DATABASE_URL` = 비밀번호 `Daylog20260326DB` (**잘못됨**)
- `.env.local` → `DATABASE_URL` = 비밀번호 `apple2006APPLEDD` (**올바름**)

**결과**: Next.js는 `.env.local` 우선 로드하므로 실제 앱은 정상 작동
**위험**: `.env.local`이 없는 환경(CI/CD, 팀원 개발 환경)에서 `.env`만 사용하면 DB 연결 실패
**권장**: `.env.local`에만 올바른 자격증명 유지, `.env`는 가짜/기본값으로 커밋

---

### 4. 새 dev 서버 기동 시 404 발생
**상황**: `npm run dev` 중복 실행 → 포트 3001에서 새 서버 시작 → 3000 서버가 hot-reload
**증상**: hot-reload 직후 첫 번째 `/api/register` 요청 → 404
**원인**: Next.js dev 서버가 route handler를 lazy-compile하므로 첫 요청 시 컴파일 중이면 404 반환
**해결**: 잠시 기다린 후 재시도하면 정상 (두 번째 요청부터 201/409 정상 반환)
**교훈**: dev 환경에서 첫 요청 오류 = 컴파일 지연일 수 있음, 바로 코드 수정하지 말고 재시도 먼저

---

### 5. CSRF 토큰 없이 NextAuth 로그인 실패
**오류**: `location: http://localhost:3000/login?error=MissingCSRF`
**원인**: `GET /api/auth/csrf`로 토큰만 받고 쿠키를 같은 요청에 포함하지 않음
**해결**: CSRF 토큰 획득 시 `-c cookies.txt` (저장)와 로그인 시 `-b cookies.txt` (전송) 함께 사용
```bash
# 올바른 방법
curl -c /tmp/cookies.txt http://localhost:3000/api/auth/csrf
curl -b /tmp/cookies.txt -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials ...
```

---

## 최종 플로우 테스트 결과

| 단계 | 결과 | 비고 |
|------|------|------|
| 회원가입 `/api/register` | ✅ | 신규 201, 중복 409 |
| 로그인 (NextAuth credentials) | ✅ | JWT 발급 확인 |
| JWT에 workspaceId 포함 | ✅ | `jwt` 콜백 정상 동작 |
| 미들웨어 리다이렉트 | ✅ | 무한루프 없음 |
| 워크스페이스 생성 | ✅ | 201, 기존 멤버 200+alreadyExists |
| 세션 자동 갱신 | ✅ | `!token.workspaceId` 조건으로 자동 재조회 |
| DB 레코드 확인 | ✅ | User, Workspace, WorkspaceMember 정상 생성 |

---

## 코드에서 발견된 설계 포인트

### JWT 자동 갱신 로직 (auth.ts)
```ts
const needsWorkspaceLookup =
  !!user || trigger === "update" || !token.workspaceId;
```
- `!token.workspaceId` 조건으로 워크스페이스 없는 유저는 매 세션 체크마다 DB 재조회
- 워크스페이스 생성 후 `update()` 호출 없이도 다음 세션 접근 시 자동으로 workspaceId 획득
- `update()` 호출(`trigger === "update"`)은 즉시 갱신을 위한 명시적 트리거

### 미들웨어 리다이렉트 안전성
```
/login (비로그인) → 통과
/login (로그인+워크스페이스없음) → /onboarding
/login (로그인+워크스페이스있음) → /
/onboarding (로그인) → 항상 통과 (NO_WORKSPACE_PATHS)
/ (워크스페이스없음) → /onboarding
/ (워크스페이스있음) → 통과
```
무한루프 경로 없음 확인됨

---

## 테스트 계정 (Supabase DB에 존재)
- `test@daylog.com` - 워크스페이스 "테스트 워크스페이스" (OWNER)
- `newtest@daylog.com` - 워크스페이스 "New Workspace" (OWNER)
- `flowtest@daylog.com` - 워크스페이스 없음 (회원가입만)
