-- EmbedBot 2.0, additive setup. Apply in staging first; no webshop writes.
begin;
create table if not exists public.commerce_integrations (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  platform text not null check (platform in ('shopify', 'woocommerce')),
  shop_url text not null,
  credentials text,
  status text not null default 'connected' check (status in ('connected','error','disconnected','pending')),
  revision uuid not null default gen_random_uuid(),
  tested_at timestamptz,
  refresh_lock uuid,
  refresh_locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.commerce_connection_attempts (
  token_hash text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  origin text not null,
  currency text not null,
  revision uuid not null,
  expires_at timestamptz not null,
  consumed_at timestamptz
);
create index if not exists commerce_connection_business on public.commerce_connection_attempts(business_id);
create index if not exists commerce_connection_expiry on public.commerce_connection_attempts(expires_at);
create table if not exists public.commerce_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  notification_email text,
  updated_at timestamptz not null default now()
);
create table if not exists public.commerce_order_challenges (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  session_hash text not null,
  code_hash text not null,
  order_input text,
  integration_revision uuid not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists commerce_challenge_business on public.commerce_order_challenges(business_id);
create index if not exists commerce_challenge_expiry on public.commerce_order_challenges(expires_at);
create table if not exists public.commerce_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  case_number bigint generated always as identity unique,
  submission_key text not null,
  contact_email text not null,
  description text not null check (length(description) between 10 and 5000),
  order_number text,
  customer_verified boolean not null default false check (customer_verified = false),
  context jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','in_progress','closed')),
  notification_email text,
  notification_status text not null default 'pending' check (notification_status in ('pending','sending','sent','failed','not_configured')),
  notification_attempts integer not null default 0,
  notification_first_attempt_at timestamptz,
  notification_updated_at timestamptz not null default now(),
  notification_provider_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, submission_key)
);
create index if not exists commerce_tickets_business_status on public.commerce_tickets(business_id,status,created_at desc);
create index if not exists commerce_tickets_notification on public.commerce_tickets(notification_status,notification_updated_at) where notification_status in ('pending','failed','sending');
-- RLS plus revoked grants: encrypted credentials and OTPs are server-only.
-- Dashboard uses authenticated server routes with explicit business ownership.
alter table public.commerce_integrations enable row level security;
alter table public.commerce_connection_attempts enable row level security;
alter table public.commerce_settings enable row level security;
alter table public.commerce_order_challenges enable row level security;
alter table public.commerce_tickets enable row level security;
revoke all on public.commerce_integrations, public.commerce_connection_attempts, public.commerce_settings, public.commerce_order_challenges, public.commerce_tickets from public, anon, authenticated;
grant all on public.commerce_integrations, public.commerce_connection_attempts, public.commerce_settings, public.commerce_order_challenges, public.commerce_tickets to service_role;
grant usage, select on sequence public.commerce_tickets_case_number_seq to service_role;

-- Atomic one-time consumption, including attempts on incorrect codes. The hash
-- includes challenge ID and a secret server HMAC key, defeating offline guesses.
create or replace function public.consume_commerce_challenge(p_id uuid, p_business_id uuid, p_session_hash text, p_code_hash text, p_revision uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare row public.commerce_order_challenges%rowtype;
begin
  select * into row from public.commerce_order_challenges where id = p_id and business_id = p_business_id and session_hash = p_session_hash for update;
  if not found or row.consumed_at is not null or row.expires_at <= now() or row.attempts >= 5 or row.integration_revision <> p_revision then return null; end if;
  update public.commerce_order_challenges set attempts = attempts + 1 where id = row.id;
  if row.code_hash <> p_code_hash or row.order_input is null then return null; end if;
  update public.commerce_order_challenges set consumed_at = now(), order_input = null where id = row.id;
  return row.order_input;
end; $$;
revoke all on function public.consume_commerce_challenge(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.consume_commerce_challenge(uuid,uuid,text,text,uuid) to service_role;

-- Leasing prevents two workers from sending at once. Provider idempotency is
-- also required. Stop automatic retries before Resend's 24-hour dedup expiry.
create or replace function public.claim_commerce_notification(p_id uuid, p_business_id uuid)
returns setof public.commerce_tickets language sql security invoker set search_path = '' as $$
  update public.commerce_tickets set notification_status = 'sending', notification_attempts = notification_attempts + 1,
    notification_first_attempt_at = coalesce(notification_first_attempt_at, now()), notification_updated_at = now()
  where id = p_id and business_id = p_business_id and notification_email is not null and notification_attempts < 5
    and (notification_first_attempt_at is null or notification_first_attempt_at > now() - interval '23 hours')
    and (notification_status in ('pending','failed','not_configured') or (notification_status = 'sending' and notification_updated_at < now() - interval '2 minutes'))
  returning *;
$$;
revoke all on function public.claim_commerce_notification(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_commerce_notification(uuid,uuid) to service_role;
create or replace function public.consume_commerce_connection(p_token_hash text)
returns setof public.commerce_connection_attempts language sql security invoker set search_path = '' as $$
  update public.commerce_connection_attempts a set consumed_at = now()
  where a.token_hash = p_token_hash and a.consumed_at is null and a.expires_at > now()
    and exists (select 1 from public.commerce_integrations i where i.business_id = a.business_id and i.revision = a.revision and i.status = 'pending')
  returning a.*;
$$;
revoke all on function public.consume_commerce_connection(text) from public,anon,authenticated;
grant execute on function public.consume_commerce_connection(text) to service_role;
commit;
