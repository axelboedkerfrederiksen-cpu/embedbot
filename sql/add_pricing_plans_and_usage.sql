-- Adds EmbedBot pricing plans and an atomic monthly AI-answer allowance.
-- Run this in the Supabase SQL Editor before deploying the matching application code.

alter table public.businesses
add column if not exists plan text not null default 'starter',
add column if not exists ai_answers_used integer not null default 0,
add column if not exists ai_answer_limit_override integer,
add column if not exists ai_usage_period_start date not null
  default (date_trunc('month', timezone('utc', now())))::date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_plan_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_plan_check
      check (plan in ('starter', 'growth', 'scale', 'enterprise'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_ai_answers_used_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_ai_answers_used_check
      check (ai_answers_used >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_ai_answer_limit_override_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_ai_answer_limit_override_check
      check (ai_answer_limit_override is null or ai_answer_limit_override >= 30000);
  end if;
end
$$;

create index if not exists businesses_plan_idx
  on public.businesses (plan);

create or replace function public.consume_ai_answer(
  p_business_id uuid,
  p_limit integer
)
returns table (
  allowed boolean,
  used integer,
  limit_value integer,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period_start date := (date_trunc('month', timezone('utc', now())))::date;
  v_stored_period_start date;
  v_used integer;
  v_resets_at timestamptz := timezone('utc', v_period_start + interval '1 month');
begin
  if p_limit < 1 then
    raise exception 'p_limit must be positive';
  end if;

  select b.ai_usage_period_start, b.ai_answers_used
    into v_stored_period_start, v_used
  from public.businesses as b
  where b.id = p_business_id
  for update;

  if not found then
    return query select false, 0, p_limit, v_resets_at;
    return;
  end if;

  if v_stored_period_start <> v_period_start then
    update public.businesses as b
    set ai_usage_period_start = v_period_start,
        ai_answers_used = 0
    where b.id = p_business_id;
    v_used := 0;
  end if;

  if v_used >= p_limit then
    return query select false, v_used, p_limit, v_resets_at;
    return;
  end if;

  update public.businesses as b
  set ai_answers_used = b.ai_answers_used + 1
  where b.id = p_business_id
  returning b.ai_answers_used into v_used;

  return query select true, v_used, p_limit, v_resets_at;
end;
$$;

revoke all on function public.consume_ai_answer(uuid, integer) from public;
revoke all on function public.consume_ai_answer(uuid, integer) from anon;
revoke all on function public.consume_ai_answer(uuid, integer) from authenticated;
grant execute on function public.consume_ai_answer(uuid, integer) to service_role;
