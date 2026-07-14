-- Run this in your Supabase SQL Editor.
-- Purely additive: one new table + one new function + two indexes.
-- Does NOT touch shoe_categorizations or order_plans — no existing entry,
-- photo, planned-qty, or "since" date is read, written, or migrated here.

-- ── 1. order_plan_details — planned qty per (department, category, sub_category, heels) ──
-- This is the finer-grained sibling of order_plans (which only tracks per
-- department+category). Lets the UI drill into a category and show
-- Casualwear/Partywear x heel-type breakdowns.

create table if not exists public.order_plan_details (
  id           uuid primary key default gen_random_uuid(),
  department   text not null,
  category     text not null,
  sub_category text not null,
  heels        text not null,
  planned_qty  integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (department, category, sub_category, heels)
);

alter table public.order_plan_details enable row level security;

drop policy if exists "Allow all" on public.order_plan_details;
create policy "Allow all" on public.order_plan_details
  for all using (true) with check (true);

-- ── 2. Ordered-qty aggregation at the same granularity ────────────────────────

create or replace function public.get_order_progress_detail()
returns table(department text, category text, sub_category text, heels text, ordered_qty bigint) as $$
  select department, category, sub_category, heels, coalesce(sum(total_qty), 0)::bigint as ordered_qty
  from public.shoe_categorizations
  where deleted_at is null
  group by department, category, sub_category, heels;
$$ language sql stable;

-- ── 3. Index so the detail rollup stays fast as entries grow ─────────────────

create index if not exists idx_shoe_categorizations_dept_cat_subcat_heels
  on public.shoe_categorizations (department, category, sub_category, heels) where deleted_at is null;
