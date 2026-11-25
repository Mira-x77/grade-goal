-- Allow authenticated admin panel to insert/update app_config (premium flag + code prices)
grant select on public.app_config to anon, authenticated;
grant insert, update, delete on public.app_config to authenticated;

drop policy if exists "Admin write app_config" on public.app_config;

create policy "app_config: authenticated insert"
  on public.app_config for insert
  to authenticated
  with check (true);

create policy "app_config: authenticated update"
  on public.app_config for update
  to authenticated
  using (true)
  with check (true);

create policy "app_config: authenticated delete"
  on public.app_config for delete
  to authenticated
  using (true);
