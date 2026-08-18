create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  workspace_name text not null default 'FORGE Workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  provider text not null,
  description text not null default '',
  status text not null default 'needs_config',
  permissions text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug),
  constraint tools_status_check check (status in ('enabled', 'disabled', 'needs_config'))
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  model text not null default 'openai-compatible',
  status text not null default 'idle',
  objectives text[] not null default '{}',
  tool_ids uuid[] not null default '{}',
  memory_collections text[] not null default '{}',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_status_check check (status in ('active', 'idle', 'paused', 'error'))
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  title text not null,
  objective text not null default '',
  status text not null default 'queued',
  progress smallint not null default 0,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missions_status_check check (status in ('queued', 'planning', 'running', 'review', 'completed', 'failed')),
  constraint missions_progress_check check (progress >= 0 and progress <= 100)
);

create table if not exists public.memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  title text not null,
  collection text not null,
  content text not null default '',
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  status text not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint executions_status_check check (status in ('queued', 'running', 'completed', 'failed'))
);

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  level text not null default 'info',
  source text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint logs_level_check check (level in ('info', 'warning', 'error'))
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  company_name text not null,
  website text not null default '',
  city text not null default '',
  activity text not null default '',
  qualification text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  linkedin_url text not null default '',
  source_url text not null default '',
  score smallint not null default 0,
  status text not null default 'new',
  notes text not null default '',
  follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospects_score_check check (score >= 0 and score <= 100),
  constraint prospects_status_check check (status in ('new', 'qualified', 'contacted', 'interested', 'won', 'archived')),
  unique (user_id, mission_id, company_name)
);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  step smallint not null,
  channel text not null default 'email',
  subject text not null default '',
  body text not null default '',
  status text not null default 'draft',
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_step_check check (step between 1 and 3),
  constraint outreach_channel_check check (channel in ('email')),
  constraint outreach_status_check check (status in ('draft', 'approved', 'sent', 'replied', 'skipped')),
  unique (user_id, prospect_id, step)
);

create table if not exists public.google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text not null default '',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.autopilot_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  monthly_goal integer not null default 3000,
  offer_name text not null default 'ATLYN Autopilote',
  offer_price integer not null default 89,
  ideal_customer text not null default 'Indépendant B2B francophone vendant une prestation à forte valeur et souhaitant déléguer sa prospection',
  markets text[] not null default array['France','Belgique','Suisse','Luxembourg','Canada francophone'],
  daily_prospect_limit smallint not null default 5,
  require_approval boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint autopilot_goal_check check (monthly_goal between 100 and 1000000),
  constraint autopilot_price_check check (offer_price between 1 and 100000),
  constraint autopilot_limit_check check (daily_prospect_limit between 1 and 100)
);

create table if not exists public.customer_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default '',
  offer text not null default '',
  target_customer text not null default '',
  average_deal_value integer not null default 1000,
  tone text not null default 'professionnel et direct',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.tools enable row level security;
alter table public.agents enable row level security;
alter table public.missions enable row level security;
alter table public.memory enable row level security;
alter table public.executions enable row level security;
alter table public.logs enable row level security;
alter table public.prospects enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.google_connections enable row level security;
alter table public.autopilot_settings enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.client_profiles enable row level security;

create policy "users read own profile" on public.users for select using (auth.uid() = id);
create policy "users update own profile" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert own profile" on public.users for insert with check (auth.uid() = id);

create policy "users manage own tools" on public.tools for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own agents" on public.agents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own missions" on public.missions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own memory" on public.memory for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own executions" on public.executions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own logs" on public.logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own prospects" on public.prospects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users manage own outreach" on public.outreach_messages for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.prospects to authenticated;
grant all on public.prospects to service_role;
grant select, insert, update, delete on public.outreach_messages to authenticated;
grant all on public.outreach_messages to service_role;
revoke all on public.google_connections from anon, authenticated;
grant all on public.google_connections to service_role;
create policy "users manage own autopilot" on public.autopilot_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.autopilot_settings to authenticated;
grant all on public.autopilot_settings to service_role;
create policy "users read own subscription" on public.customer_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "users manage own client profile" on public.client_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select on public.customer_subscriptions to authenticated;
grant all on public.customer_subscriptions to service_role;
grant select, insert, update, delete on public.client_profiles to authenticated;
grant all on public.client_profiles to service_role;

create index if not exists agents_user_id_idx on public.agents(user_id);
create index if not exists missions_user_id_status_idx on public.missions(user_id, status);
create index if not exists memory_user_id_collection_idx on public.memory(user_id, collection);
create index if not exists executions_user_id_mission_idx on public.executions(user_id, mission_id);
create index if not exists logs_user_id_created_at_idx on public.logs(user_id, created_at desc);
create index if not exists prospects_user_id_status_idx on public.prospects(user_id, status);
create index if not exists prospects_user_id_follow_up_idx on public.prospects(user_id, follow_up_at) where follow_up_at is not null;
create index if not exists prospects_mission_id_idx on public.prospects(mission_id);
create index if not exists outreach_user_status_schedule_idx on public.outreach_messages(user_id, status, scheduled_at);
create index if not exists outreach_prospect_id_idx on public.outreach_messages(prospect_id);
