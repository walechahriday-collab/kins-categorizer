-- Run this in your Supabase SQL Editor

create table if not exists public.shoe_categorizations (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,
  section       text,
  seasons       text[] default '{}',
  occasions     text[] default '{}',
  heel_type     text,
  heel_height   text,
  notes         text,
  photo_url     text,
  sketch_data   text,
  created_at    timestamptz default now()
);

-- Open read/write access for the anon key (adjust RLS as needed)
alter table public.shoe_categorizations enable row level security;

create policy "Allow all" on public.shoe_categorizations
  for all using (true) with check (true);
