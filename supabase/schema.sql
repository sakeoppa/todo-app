-- ============================================
-- 할 일 앱 데이터베이스 스키마
-- Supabase 프로젝트 → SQL Editor 에 붙여넣고 실행
-- ============================================

-- 1. todos 테이블 (할 일)
create table if not exists todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  completed   boolean not null default false,
  quadrant    text not null default 'important-urgent',
  memo        text,
  due_date    date,
  repeat      text not null default 'none',
  sub_tasks   jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. preferences 테이블 (사용자별 설정)
create table if not exists preferences (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  ai_provider       text not null default 'anthropic',
  anthropic_api_key text,
  ollama_url        text default 'http://localhost:11434',
  ollama_model      text
);

-- 기존 preferences 테이블에 ai_provider 컬럼이 없으면 추가 (마이그레이션용)
-- alter table preferences add column if not exists ai_provider text not null default 'anthropic';

-- 3. 조회 속도용 인덱스
create index if not exists todos_user_id_idx on todos(user_id);

-- ============================================
-- RLS (Row Level Security) — 본인 데이터만 접근 가능
-- 이게 핵심 보안. 켜두면 DB가 자동으로 남의 데이터 차단.
-- ============================================

alter table todos enable row level security;
alter table preferences enable row level security;

-- todos: 본인 것만 읽기/쓰기/수정/삭제
create policy "본인 todos만 접근"
  on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- preferences: 본인 것만
create policy "본인 preferences만 접근"
  on preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- updated_at 자동 갱신 트리거
-- ============================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger todos_updated_at
  before update on todos
  for each row execute function set_updated_at();
