create table if not exists agents (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) not null,
  name text not null, role text not null, status text not null default 'idle', created_at timestamptz default now()
);
create table if not exists missions (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) not null,
  agent_id uuid references agents(id), title text not null, status text not null default 'queued', progress smallint not null default 0, created_at timestamptz default now()
);
create table if not exists memory_items (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) not null,
  title text not null, collection text not null, content text, created_at timestamptz default now()
);
alter table agents enable row level security; alter table missions enable row level security; alter table memory_items enable row level security;
create policy "users manage own agents" on agents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own missions" on missions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own memory" on memory_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
