-- Default premium code prices shown in the mobile app (admin-editable via app_config)
insert into app_config (key, value)
values (
  'premium_code_pricing',
  '{"currency":"FCFA","month1":1500,"month3":4500,"month6":9000,"month12":18000}'::jsonb
)
on conflict (key) do nothing;
