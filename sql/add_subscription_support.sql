-- Subscription support for business-level access control.
-- Idempotent: can be executed multiple times safely.

alter table public.businesses
add column if not exists subscription_status text default 'inactive',
add column if not exists payment_status text default 'unpaid',
add column if not exists stripe_customer_id text,
add column if not exists stripe_subscription_id text,
add column if not exists current_period_end timestamptz,
add column if not exists canceled_at timestamptz,
add column if not exists activated_at timestamptz,
add column if not exists subscription_updated_at timestamptz default now();

create index if not exists businesses_subscription_status_idx
  on public.businesses (subscription_status);

create index if not exists businesses_payment_status_idx
  on public.businesses (payment_status);

create unique index if not exists businesses_stripe_subscription_id_uidx
  on public.businesses (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists businesses_user_subscription_idx
  on public.businesses (user_id, subscription_status);

alter table public.businesses
drop constraint if exists businesses_subscription_status_check;

alter table public.businesses
add constraint businesses_subscription_status_check
check (
  subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')
);

alter table public.businesses
drop constraint if exists businesses_payment_status_check;

alter table public.businesses
add constraint businesses_payment_status_check
check (
  payment_status in ('unpaid', 'paid', 'failed', 'refunded')
);
