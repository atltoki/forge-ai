-- Apply after 20261113_atl_director.sql; only adds optional ORBIT fields.
alter table public.director_projects
  add column if not exists orbit_project_id text,
  add column if not exists orbit_focus boolean not null default false,
  add column if not exists orbit_next_action text not null default '',
  add column if not exists orbit_note text not null default '',
  add column if not exists orbit_evidence_url text not null default '',
  add column if not exists orbit_review_date date,
  add column if not exists orbit_revision text not null default '',
  add column if not exists orbit_last_sync_at timestamptz;
create unique index if not exists director_projects_orbit_id_uniq
  on public.director_projects (user_id, orbit_project_id) where orbit_project_id is not null;
