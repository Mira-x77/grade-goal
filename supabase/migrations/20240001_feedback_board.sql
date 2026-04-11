-- Feedback Board Migration
-- Run this in your Supabase SQL editor

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'under_review'
                check (status in ('under_review','planned','in_progress','completed')),
  created_at  timestamptz not null default now()
);

create table if not exists public.votes (
  id          uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (feedback_id, user_id)   -- one vote per user per item
);

-- Indexes for fast sorting
create index if not exists feedback_created_at_idx on public.feedback(created_at desc);
create index if not exists votes_feedback_id_idx   on public.votes(feedback_id);

-- RLS
alter table public.feedback enable row level security;
alter table public.votes    enable row level security;

-- Anyone authenticated can read feedback
create policy "read feedback" on public.feedback
  for select using (auth.role() = 'authenticated');

-- Only the author can insert their own feedback
create policy "insert own feedback" on public.feedback
  for insert with check (auth.uid() = user_id);

-- Only the author can delete their own feedback
create policy "delete own feedback" on public.feedback
  for delete using (auth.uid() = user_id);

-- Status updates: only service_role (admin) can update status
create policy "admin update status" on public.feedback
  for update using (auth.role() = 'service_role');

-- Votes: authenticated users can read all votes
create policy "read votes" on public.votes
  for select using (auth.role() = 'authenticated');

-- Users can only insert their own vote
create policy "insert own vote" on public.votes
  for insert with check (auth.uid() = user_id);

-- Users can only delete their own vote
create policy "delete own vote" on public.votes
  for delete using (auth.uid() = user_id);

-- Convenience view: feedback with vote count + whether current user voted
create or replace view public.feedback_with_votes as
select
  f.*,
  count(v.id)::int                                          as vote_count,
  bool_or(v.user_id = auth.uid())                           as user_voted
from public.feedback f
left join public.votes v on v.feedback_id = f.id
group by f.id;

grant select on public.feedback_with_votes to authenticated;
