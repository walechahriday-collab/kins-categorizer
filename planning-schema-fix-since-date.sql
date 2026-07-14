-- Run this in your Supabase SQL Editor.
-- Fixes a bug: setting a Planned Qty for a category that had no plan row
-- yet silently started counting "ordered" from that moment instead of
-- all-time, hiding real order history. This makes period_start optional
-- (NULL = all-time, the correct default) and clears every row back to
-- all-time — nothing in shoe_categorizations (your actual entries) is
-- touched by this script.

alter table public.order_plans alter column period_start drop default;
alter table public.order_plans alter column period_start drop not null;

update public.order_plans set period_start = null;
