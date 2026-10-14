-- Run this once in the Supabase SQL editor to create the crowd clock table.

create table if not exists public.entries (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  stop_minutes integer not null check (stop_minutes between 0 and 1439),
  city        text not null check (char_length(city) between 1 and 40),
  occupation  text not null check (char_length(occupation) between 1 and 40)
);

create index if not exists entries_created_at_idx on public.entries (created_at desc);

alter table public.entries enable row level security;

-- Anyone may add an answer and read answers. Nobody can edit or delete through the API.
drop policy if exists "anyone can add" on public.entries;
create policy "anyone can add" on public.entries
  for insert to anon with check (true);

drop policy if exists "anyone can read" on public.entries;
create policy "anyone can read" on public.entries
  for select to anon using (true);
