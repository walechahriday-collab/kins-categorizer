-- Run this in your Supabase SQL Editor.
-- Purely additive: adds one column + trigger to shoe_categorizations (existing rows
-- are only touched by a no-op backfill update that recomputes the new column —
-- no existing entry data, photos, or fields are altered), plus two new tables/functions.

-- ── 1. total_qty on shoe_categorizations ──────────────────────────────────────
-- "Real" pairs ordered per entry = sum over color variants of
-- (sum of qty_15..qty_47) * set_qty — i.e. exactly the "Multiply" value already
-- shown per color row in the app. Computed by trigger so it's always correct,
-- no matter which code path writes/edits a row.

alter table public.shoe_categorizations add column if not exists total_qty integer not null default 0;

create or replace function public.compute_total_qty() returns trigger as $$
declare
  variants jsonb;
  v jsonb;
  qty_sum integer;
  set_qty integer;
  total integer := 0;
  size_keys text[] := array[
    'qty_15','qty_16','qty_17','qty_18','qty_19','qty_20','qty_21','qty_22','qty_23','qty_24',
    'qty_25','qty_26','qty_27','qty_28','qty_29','qty_30','qty_31','qty_32','qty_33','qty_34',
    'qty_35','qty_36','qty_37','qty_38','qty_39','qty_40','qty_41','qty_42','qty_43','qty_44',
    'qty_45','qty_46','qty_47'
  ];
  k text;
begin
  begin
    variants := coalesce(nullif(new.color_variants, '')::jsonb, '[]'::jsonb);
  exception when others then
    variants := '[]'::jsonb;
  end;

  for v in select * from jsonb_array_elements(variants)
  loop
    qty_sum := 0;
    foreach k in array size_keys loop
      qty_sum := qty_sum + coalesce(nullif(v->>k, '')::int, 0);
    end loop;
    set_qty := coalesce(nullif(v->>'set_qty', '')::int, 0);
    total := total + qty_sum * set_qty;
  end loop;

  new.total_qty := total;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_compute_total_qty on public.shoe_categorizations;
create trigger trg_compute_total_qty
  before insert or update on public.shoe_categorizations
  for each row execute function public.compute_total_qty();

-- Backfill existing rows (no-op write of the same value — just fires the trigger
-- above so total_qty gets populated for entries that already existed).
update public.shoe_categorizations set color_variants = color_variants;

-- ── 2. order_plans table ──────────────────────────────────────────────────────

create table if not exists public.order_plans (
  id           uuid primary key default gen_random_uuid(),
  department   text not null,
  category     text not null,
  planned_qty  integer not null default 0,
  period_start timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (department, category)
);

alter table public.order_plans enable row level security;

drop policy if exists "Allow all" on public.order_plans;
create policy "Allow all" on public.order_plans
  for all using (true) with check (true);

-- ── 3. Aggregation functions (so counting happens in Postgres, not the browser) ─

create or replace function public.get_order_progress()
returns table(department text, category text, ordered_qty bigint) as $$
  select s.department, s.category, coalesce(sum(s.total_qty), 0)::bigint as ordered_qty
  from public.shoe_categorizations s
  left join public.order_plans p
    on p.department = s.department and p.category = s.category
  where s.deleted_at is null
    and s.created_at >= coalesce(p.period_start, '1970-01-01'::timestamptz)
  group by s.department, s.category;
$$ language sql stable;

create or replace function public.get_department_subcategory_totals()
returns table(department text, sub_category text, ordered_qty bigint) as $$
  select department, sub_category, coalesce(sum(total_qty), 0)::bigint as ordered_qty
  from public.shoe_categorizations
  where deleted_at is null
  group by department, sub_category;
$$ language sql stable;

-- ── 4. Indexes so both queries stay fast as the table grows ──────────────────

create index if not exists idx_shoe_categorizations_dept_cat
  on public.shoe_categorizations (department, category) where deleted_at is null;

create index if not exists idx_shoe_categorizations_dept_subcat
  on public.shoe_categorizations (department, sub_category) where deleted_at is null;
