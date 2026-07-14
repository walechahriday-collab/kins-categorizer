-- Run this in your Supabase SQL Editor AFTER planning-schema-detail.sql and
-- planning-data-ld-mb.sql.
-- Syncs each category's outer "PLANNED" number (order_plans.planned_qty) to
-- the sum of its Casualwear/Partywear x heel breakdown (order_plan_details),
-- so the total you see outside a category matches what you see when you
-- expand it. Only touches (department, category) pairs that exist in
-- order_plan_details — right now that's just the 16 Ladies Footwears
-- categories from the Sep'26-Feb'27 import. No other category, department,
-- or shoe_categorizations entry is read or written.

insert into public.order_plans (department, category, planned_qty)
select department, category, sum(planned_qty)::integer
from public.order_plan_details
group by department, category
on conflict (department, category)
do update set planned_qty = excluded.planned_qty;
