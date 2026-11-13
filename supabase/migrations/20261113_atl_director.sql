-- Apply manually in the connected Supabase project after code review.
-- No data are changed in the existing Forge AI tables.
create extension if not exists pgcrypto;

create table if not exists public.director_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  stage text not null default 'unverified' check (stage in ('unverified','idea','building','live','paused')),
  revenue_potential smallint not null default 2 check (revenue_potential between 0 and 5),
  urgency smallint not null default 2 check (urgency between 0 and 5),
  alignment smallint not null default 2 check (alignment between 0 and 5),
  evidence smallint not null default 0 check (evidence between 0 and 5),
  effort smallint not null default 2 check (effort between 0 and 5),
  risk smallint not null default 2 check (risk between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.director_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_date date not null default (now() at time zone 'UTC')::date,
  proposals_created smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, cycle_date)
);

create table if not exists public.director_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.director_projects(id) on delete cascade,
  cycle_id uuid references public.director_cycles(id) on delete set null,
  proposal_key text not null,
  title text not null,
  objective text not null,
  rationale text not null,
  agent_key text not null check (agent_key in ('research','builder')),
  action_kind text not null check (action_kind in ('observe','draft','branch_write','deploy','outreach','spend','destructive')),
  requires_approval boolean not null default true,
  priority_score smallint not null check (priority_score between 0 and 100),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','queued','completed','failed')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, proposal_key)
);

create index if not exists director_projects_user_idx on public.director_projects(user_id);
create index if not exists director_proposals_user_status_idx on public.director_proposals(user_id, status, created_at desc);

alter table public.director_projects enable row level security;
alter table public.director_cycles enable row level security;
alter table public.director_proposals enable row level security;

drop policy if exists director_projects_owner on public.director_projects;
create policy director_projects_owner on public.director_projects for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists director_cycles_owner on public.director_cycles;
create policy director_cycles_owner on public.director_cycles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists director_proposals_owner on public.director_proposals;
create policy director_proposals_owner on public.director_proposals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
