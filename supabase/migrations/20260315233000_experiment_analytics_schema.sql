-- Robust experiment analytics schema for homepage CRO and A/B testing

create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  rollout_percentage int not null default 100 check (rollout_percentage >= 0 and rollout_percentage <= 100),
  targeting jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists experiment_variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  key text not null,
  name text not null,
  weight int not null default 1 check (weight > 0),
  config jsonb not null default '{}'::jsonb,
  is_control boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experiment_id, key)
);

create table if not exists experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  variant_id uuid not null references experiment_variants(id) on delete cascade,
  subject_key text not null,
  user_id text,
  anonymous_id text,
  context jsonb not null default '{}'::jsonb,
  assigned_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (experiment_id, subject_key)
);

create table if not exists experiment_exposures (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  variant_id uuid not null references experiment_variants(id) on delete cascade,
  assignment_id uuid references experiment_assignments(id) on delete set null,
  user_id text,
  anonymous_id text,
  exposure_key text not null,
  page text,
  metadata jsonb not null default '{}'::jsonb,
  exposed_at timestamptz not null default now(),
  unique (experiment_id, exposure_key)
);

create table if not exists experiment_conversions (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  variant_id uuid not null references experiment_variants(id) on delete cascade,
  assignment_id uuid references experiment_assignments(id) on delete set null,
  user_id text,
  anonymous_id text,
  conversion_type text not null,
  value numeric(12,2),
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  converted_at timestamptz not null default now()
);

create index if not exists idx_experiment_variants_experiment_id on experiment_variants(experiment_id);
create index if not exists idx_experiment_assignments_experiment_id on experiment_assignments(experiment_id);
create index if not exists idx_experiment_assignments_subject on experiment_assignments(subject_key);
create index if not exists idx_experiment_exposures_experiment_id on experiment_exposures(experiment_id);
create index if not exists idx_experiment_exposures_variant_id on experiment_exposures(variant_id);
create index if not exists idx_experiment_conversions_experiment_id on experiment_conversions(experiment_id);
create index if not exists idx_experiment_conversions_variant_id on experiment_conversions(variant_id);
create index if not exists idx_experiment_conversions_type on experiment_conversions(conversion_type);

-- Seed initial homepage pricing CTA experiment
insert into experiments (key, name, description, status, rollout_percentage, started_at)
values (
  'homepage_pricing_cta_v1',
  'Homepage Pricing CTA V1',
  'Aggressive CTA copy test for pricing intent and sign-up starts',
  'active',
  100,
  now()
)
on conflict (key) do nothing;

with exp as (
  select id from experiments where key = 'homepage_pricing_cta_v1'
)
insert into experiment_variants (experiment_id, key, name, weight, is_control, config)
select exp.id, 'control', 'Control - Sign Up Free', 25, true, '{"ctaText":"Sign Up Free","ctaClass":"bg-primary text-primary-foreground"}'::jsonb from exp
union all
select exp.id, 'speed', 'Speed - Start Learning Fast', 25, false, '{"ctaText":"Start Learning Fast","ctaClass":"bg-[#1b222d] text-white border border-white/15 hover:bg-[#232b38]"}'::jsonb from exp
union all
select exp.id, 'value', 'Value - See Premium Benefits', 25, false, '{"ctaText":"Unlock Better Grades","ctaClass":"bg-[#121920] text-white border border-emerald-300/40 hover:bg-[#18212b]"}'::jsonb from exp
union all
select exp.id, 'urgency', 'Urgency - Start Today', 25, false, '{"ctaText":"Start Today","ctaClass":"bg-[#1f1820] text-white border border-white/15 hover:bg-[#2a2030]"}'::jsonb from exp
on conflict (experiment_id, key) do nothing;
