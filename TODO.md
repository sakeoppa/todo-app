# 클라우드 출시 마이그레이션 진척

> Next.js 로컬 앱 → Vercel + Supabase 클라우드 서비스로 전환

## 결정 사항
- 로그인: 이메일 + 비밀번호 (구글은 나중에, Console 설정 번거로워 보류)
- AI: 사용자 본인 Anthropic API 키 입력
- Electron: 폐기
- MCP: 제거
- 앱 이름: 미정 (`your-todo.vercel.app` 임시)

---

## Phase 0: 계정 준비 (사용자)
- [x] GitHub 계정 (`sakeoppa`)
- [x] Supabase 계정 + 프로젝트 생성
- [ ] Supabase API 키 2개 확보 (URL, anon key)
- [ ] Google OAuth 클라이언트 생성
- [ ] Vercel 계정

## Phase 1: Electron + MCP 제거
- [x] `electron/` 폴더 삭제
- [x] `lib/mcp/`, `lib/store/mcp-config.ts` 삭제
- [x] 컴포넌트 삭제: McpServerForm, McpServerList, ElectronBridge, BackupSection
- [x] `app/api/quick-add/` 삭제
- [x] package.json 에서 Electron 의존성·빌드 설정 제거
- [x] `/Applications/TodoApp.app` 삭제
- [x] LaunchAgent 제거

## Phase 2: 데이터베이스
- [x] 스키마 SQL 작성 (`supabase/schema.sql`)
- [x] Supabase SQL Editor 에서 스키마 실행 (Success)
- [ ] RLS 동작 확인 (로그인 붙은 후)

## Phase 3: 인증 + 페이지
- [x] Supabase 클라이언트 설정 (`lib/supabase/`)
- [x] 미들웨어 헬퍼 작성 (`lib/supabase/middleware.ts`) — 아직 비활성
- [x] `/login` 페이지
- [x] `/signup` 페이지
- [x] `/auth/callback` 라우트
- [x] 헤더 로그아웃 버튼 (로그인 시에만 표시)
- [x] 설정 페이지에 Anthropic 키 입력 칸
- [x] 루트 `middleware.ts` 활성화 — 로그인 게이트 작동 확인

## Phase 4: DB 마이그레이션
- [x] `lib/store/todos.ts` → Supabase 호출로 교체
- [x] `lib/store/preferences.ts` → Supabase 호출로 교체
- [x] API 라우트에 사용자 인증 체크 추가
- [x] `app/actions.ts` (hasApiKey) 정리

## Phase 5: PWA
- [x] `public/manifest.json`
- [x] 앱 아이콘 (192, 512)

## Phase 6: 배포
- [ ] GitHub 저장소 푸시
- [ ] Vercel 연결
- [ ] 환경변수 등록 (Supabase URL/키)
- [ ] 배포 + URL 확인

## Phase 7: 베타 테스트
- [ ] 본인 회원가입 테스트
- [ ] 친구 1~2명 테스트
- [ ] 피드백 반영
