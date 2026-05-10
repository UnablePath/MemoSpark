-- MemoSpark experiment analytics: RLS lockdown + idempotent seed repair.
-- Direct PostgREST access from anon/authenticated is denied; Next.js uses SUPABASE_SERVICE_ROLE_KEY only.

alter table if exists public.experiments enable row level security;
alter table if exists public.experiment_variants enable row level security;
alter table if exists public.experiment_assignments enable row level security;
alter table if exists public.experiment_exposures enable row level security;
alter table if exists public.experiment_conversions enable row level security;

-- Repair / upsert canonical homepage CTA experiment (production may have missed first seed or status drifted)
insert into public.experiments (key, name, description, status, rollout_percentage, started_at)
values (
  'homepage_pricing_cta_v1',
  'Homepage Pricing CTA V1',
  'Aggressive CTA copy test for pricing intent and sign-up starts',
  'active',
  100,
  now()
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  rollout_percentage = excluded.rollout_percentage,
  started_at = coalesce(public.experiments.started_at, excluded.started_at),
  updated_at = now();

with exp as (
  select id from public.experiments where key = 'homepage_pricing_cta_v1'
)
insert into public.experiment_variants (experiment_id, key, name, weight, is_control, is_active, config)
select exp.id, 'control', 'Control - Sign Up Free', 25, true, true, '{"ctaText":"Sign Up Free","ctaClass":"bg-primary text-primary-foreground"}'::jsonb from exp
union all
select exp.id, 'speed', 'Speed - Start Learning Fast', 25, false, true, '{"ctaText":"Start Learning Fast","ctaClass":"bg-[#1b222d] text-white border border-white/15 hover:bg-[#232b38]"}'::jsonb from exp
union all
select exp.id, 'value', 'Value - See Premium Benefits', 25, false, true, '{"ctaText":"Unlock Better Grades","ctaClass":"bg-[#121920] text-white border border-emerald-300/40 hover:bg-[#18212b]"}'::jsonb from exp
union all
select exp.id, 'urgency', 'Urgency - Start Today', 25, false, true, '{"ctaText":"Start Today","ctaClass":"bg-[#1f1820] text-white border border-white/15 hover:bg-[#2a2030]"}'::jsonb from exp
on conflict (experiment_id, key) do update set
  name = excluded.name,
  weight = excluded.weight,
  is_control = excluded.is_control,
  is_active = excluded.is_active,
  config = excluded.config,
  updated_at = now();
