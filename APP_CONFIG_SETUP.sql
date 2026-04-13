-- Create app_config table for remote feature flags
create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Insert default premium_enabled flag
insert into app_config (key, value)
values ('premium_enabled', 'false'::jsonb)
on conflict (key) do nothing;

-- RLS
alter table app_config enable row level security;

-- Anyone (including anon) can read
create policy "Public read app_config"
  on app_config for select
  to anon, authenticated
  using (true);

-- Only authenticated admin can write
create policy "Admin write app_config"
  on app_config for all
  to authenticated
  using (true)
  with check (true);
