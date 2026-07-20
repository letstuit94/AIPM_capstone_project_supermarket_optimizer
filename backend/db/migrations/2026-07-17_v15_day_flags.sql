-- =====================================================================
-- Epic 15.1 — Tracking-coverage primitive (Confidence Ladder).
-- Run in the Supabase SQL editor. Idempotent.
--
-- One explicit flag per (user, date): "away" — the user wasn't eating
-- from their own tracked pantry that day (travel, eating out entirely).
-- Absence of a row is NOT "untracked" by itself; day_coverage() in
-- services/day_coverage.py combines this with ConsumptionEvent presence
-- to classify each day as tracked / away / untracked. Kept as its own
-- table rather than a column on an existing one, since it's a sparse,
-- occasional flag, not a property every pantry/consumption row has.
-- =====================================================================

create table if not exists user_day_flags (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null,
    date       date not null,
    flag       text not null default 'away',
    created_at timestamptz not null default now(),
    unique (user_id, date, flag)
);

create index if not exists user_day_flags_user_id_idx on user_day_flags (user_id);

alter table user_day_flags enable row level security;

drop policy if exists own_user_day_flags on user_day_flags;
create policy own_user_day_flags on user_day_flags
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
