create table if not exists public.chat_rate_limits (
  ip_hash text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_rate_limits_updated_at_idx
  on public.chat_rate_limits (updated_at);

create or replace function public.enforce_chat_rate_limit(
  p_ip_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.chat_rate_limits%rowtype;
  now_ts timestamptz := now();
  window_interval interval := make_interval(secs => p_window_seconds);
begin
  if p_ip_hash is null or length(trim(p_ip_hash)) = 0 then
    return false;
  end if;

  insert into public.chat_rate_limits (ip_hash, count, window_start, updated_at)
  values (p_ip_hash, 1, now_ts, now_ts)
  on conflict (ip_hash) do nothing;

  select *
    into current_row
    from public.chat_rate_limits
   where ip_hash = p_ip_hash
   for update;

  if not found then
    return false;
  end if;

  if now_ts >= current_row.window_start + window_interval then
    update public.chat_rate_limits
       set count = 1,
           window_start = now_ts,
           updated_at = now_ts
     where ip_hash = p_ip_hash;

    return false;
  end if;

  if current_row.count >= p_limit then
    update public.chat_rate_limits
       set updated_at = now_ts
     where ip_hash = p_ip_hash;

    return true;
  end if;

  update public.chat_rate_limits
     set count = current_row.count + 1,
         updated_at = now_ts
   where ip_hash = p_ip_hash;

  return false;
end;
$$;