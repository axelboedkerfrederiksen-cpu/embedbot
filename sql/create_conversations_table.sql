-- Historical bootstrap helper. Use ordered supabase/migrations for deployment.
-- Ownership requires businesses.user_id; never fall back to broad read access.
create table if not exists public.conversations (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 created_at timestamptz not null default now(),messages jsonb not null default '[]'::jsonb
);
alter table public.conversations enable row level security;
drop policy if exists "Authenticated users can read conversations" on public.conversations;
drop policy if exists "Users can read conversations of their businesses" on public.conversations;
create policy "Users can read conversations of their businesses" on public.conversations for select to authenticated
using(exists(select 1 from public.businesses where businesses.id=conversations.business_id and businesses.user_id=auth.uid()));
revoke all on public.conversations from anon,authenticated;
grant select on public.conversations to authenticated;
