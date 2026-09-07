-- Add grading_system tag to feedback so Nigerian and French/APC ideas are separated
alter table public.feedback
  add column if not exists grading_system text not null default 'apc'
    check (grading_system in ('apc', 'french', 'nigerian_university'));

-- Recreate view to include grading_system
create or replace view public.feedback_with_votes as
select
  f.*,
  count(v.id)::int                                          as vote_count,
  bool_or(v.user_id = auth.uid())                           as user_voted
from public.feedback f
left join public.votes v on v.feedback_id = f.id
group by f.id;

grant select on public.feedback_with_votes to authenticated;
