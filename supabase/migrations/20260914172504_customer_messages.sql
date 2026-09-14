create extension if not exists pgcrypto;

create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sender text not null default 'admin',
  title text not null,
  body text not null,
  action_url text,
  action_label text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint customer_messages_sender_check check (sender in ('admin', 'system')),
  constraint customer_messages_title_length check (char_length(title) between 1 and 160),
  constraint customer_messages_body_length check (char_length(body) between 1 and 5000)
);

create index if not exists customer_messages_business_created_idx
  on public.customer_messages (business_id, created_at desc);

create index if not exists customer_messages_unread_idx
  on public.customer_messages (business_id, created_at desc)
  where read_at is null;

alter table public.customer_messages enable row level security;

revoke all on table public.customer_messages from anon, authenticated;
grant select on table public.customer_messages to authenticated;
grant update (read_at) on table public.customer_messages to authenticated;

drop policy if exists "Customers can read own messages" on public.customer_messages;
create policy "Customers can read own messages"
  on public.customer_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses
      where businesses.id = customer_messages.business_id
        and businesses.user_id = (select auth.uid())
    )
  );

drop policy if exists "Customers can mark own messages read" on public.customer_messages;
create policy "Customers can mark own messages read"
  on public.customer_messages
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.businesses
      where businesses.id = customer_messages.business_id
        and businesses.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.businesses
      where businesses.id = customer_messages.business_id
        and businesses.user_id = (select auth.uid())
    )
  );
