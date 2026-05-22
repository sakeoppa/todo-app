# 이 프로젝트에서 Claude가 따라야 할 핵심 규칙

## 0. 현재 프로젝트 환경 (AI가 헛발질하지 않게 기준점 제시)
- **주요 기술 스택:**
  - Next.js 16 + TypeScript + React (웹)
  - Tailwind CSS v4 (스타일)
  - Electron (맥 데스크탑 앱)
  - 파일 기반 저장소 (JSON, `~/Library/Application Support/할 일/data/`)
  - Tailscale (외부 접속)
  - Anthropic / Ollama (AI 할 일 분해)
  - MCP (외부 도구 연동)
- **개발 목표:** 복잡한 구조보다 '일단 눈에 보이고 돌아가는 기능'이 최우선. 모바일·데스크탑 둘 다 지원.

## 1. 사용자에 대한 이해 (대화 톤과 설명 방식)
- 코딩을 잘 모르는 사용자다. 전문 용어를 쓸 때는 반드시 괄호 치고 짧은 비유나 설명을 덧붙인다. (예: "CSRF(다른 사이트에서 요청 위조하는 걸 막는 보안)")
- 답변은 마크다운으로 일목요연하게 정리하고, 여러 옵션을 비교할 땐 무조건 **표**를 써서 한눈에 보이게 한다.
- 결론(어떻게 해라) → 이유(왜 그래야 하는지) → 다음 단계(명령어 등) 순서로 명확히 답한다.

## 2. 🛠 코드 작성 및 수정 규칙 (바이브 코딩 필수 룰)
- **전체 코드 출력 금지:** 코드를 수정할 때는 전체 파일을 다시 쓰지 마라. 어떤 파일의 어느 부분을 어떻게 바꿔야 하는지 **기존 코드와 수정된 코드를 명확히 비교**해서(Diff 형태나 해당 함수만) 알려준다.
- **작게 쪼개서 작업하기 (Baby Steps):** 한 번에 너무 많은 기능을 구현하려 하지 마라. 하나의 기능이 정상 작동하는지 확인한 뒤에 다음 단계로 넘어간다.
- **콘솔 로그 활용:** 에러를 잡거나 데이터가 잘 넘어오는지 확인할 수 있도록, 중요한 로직 전후에는 반드시 `console.log()`나 `print()` 같은 디버깅용 코드를 알아서 심어준다.

## 3. 🚨 행동 규칙 (사고 방지)
- **파일을 지우거나, 폴더 구조를 엎거나, 대규모 변경을 하기 전에는 반드시 사용자에게 먼저 물어보고 허락을 구한다.**
- "지금 바로 해줘" / "알아서 해" 같은 지시가 있으면 묻지 말고 즉각 실행한다.
- 에러가 나거나 막혔을 때, 빙빙 돌려 말하거나 변명하지 말고 **"이 부분에서 제가 실수했습니다" 혹은 "현재 기술로 막힙니다"라고 솔직하게 말한다.**
- 사용자의 의도가 모호하면 혼자 넘겨짚지 말고, 핵심만 딱 한 번 되물어본다.

## 4. 🧪 [Lite] 빠른 개발 테스트 가이드
- **테스트 도구:** **Vitest** 사용. 새 테스트 파일은 `*.test.ts(x)` 형식.
- **최소한의 타겟팅:** DB 연동 테스트나 E2E(전체 흐름) 테스트는 과감히 생략한다.
- **핵심 로직 검증:** 돈 계산, 데이터 가공, 정렬 등 외부 의존성이 없는 순수 함수(Pure Function) 1~2개만 단위 테스트로 가볍게 검증한다. 억지로 Mocking(가짜 데이터 세팅)을 하지 마라.
- **구조와 네이밍:** 기능이 작아도 Given-When-Then 3단 구조는 주석으로 달아두고, 테스트 이름은 `할인율_계산_시_음수면_0으로_처리한다`처럼 한글로 직관적이게 작성한다.

## 5. 🗺 작업 진척도 관리 (기억 상실 방지)
- 복잡한 작업을 할 때는 `TODO.md` 파일을 만들거나 활용하여, 현재 어디까지 완료했고 다음 작업이 무엇인지 스스로 업데이트하고 체크한다.

## 6. 🚀 자주 쓰는 명령어
- 개발 서버 켜기: `HOSTNAME=0.0.0.0 npm run dev -- --port 3456`
- 개발 서버 끄기: `pkill -f "next dev"`
- LaunchAgent 재시작 (자동 시작 서버):
  ```
  launchctl unload ~/Library/LaunchAgents/com.sake.todo-app.plist
  launchctl load ~/Library/LaunchAgents/com.sake.todo-app.plist
  ```
- LaunchAgent 로그 보기: `tail -f /tmp/todo-app.log`
- Tailscale IP (모바일 접속용): `http://100.84.54.1:3456`

## 7. 🏗 아키텍처 규칙
- **데이터 변경(mutation)은 항상 `/api/*` 라우트로.** 서버 액션(`'use server'`) 신규 작성 금지 — 모바일·외부 IP 접속에서 호환성 깨짐.
  - 할 일 관련 변경: `/api/todos/mutate` (action: add, toggle, delete, addSub, removeSub, toggleSub, deleteCompleted, breakdown)
  - 설정 관련 변경: `/api/settings/mutate` (action: updateAi, updateShortcut, updateObsidian, addMcp, removeMcp, testMcp)
  - 클라이언트 헬퍼: `app/components/mutate.ts`, `app/components/settingsMutate.ts`
- **저장소는 파일 기반 JSON.** DB 추가하지 말 것 (Electron + 모바일 동시 지원을 위한 결정).
- **새 기능 만들 땐 모바일에서도 작동하는지 항상 확인.** Tailwind 사용 시 모바일(기본 클래스) → 데스크탑(`sm:`, `md:` prefix) 순서로 작성.
- **변경 후 페이지 갱신:** mutate 호출 후 `router.refresh()` 명시적으로 호출 (다른 디바이스와 30초 폴링도 있음).
