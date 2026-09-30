begin;

-- Keep direct browser access on the least privileges the dashboard needs.
-- Server-side routes use the service role and are unaffected by these grants.
revoke all privileges on table public.businesses from anon, authenticated;
revoke all privileges on table public.conversations from anon, authenticated;
revoke all privileges on table public.documents from anon, authenticated;
revoke all privileges on table public.customer_messages from anon, authenticated;
revoke all privileges on table public.chat_rate_limits from anon, authenticated;
revoke all privileges on table public.support_messages from anon, authenticated;

grant select on table public.businesses to authenticated;
grant select on table public.conversations to authenticated;
grant select on table public.documents to authenticated;
grant select on table public.customer_messages to authenticated;
grant update (read_at) on table public.customer_messages to authenticated;

alter table public.businesses enable row level security;
alter table public.conversations enable row level security;
alter table public.documents enable row level security;
alter table public.customer_messages enable row level security;
alter table public.chat_rate_limits enable row level security;
alter table public.support_messages enable row level security;

-- Remove the permissive and incorrect legacy policies.
drop policy if exists "Allow admin read" on public.businesses;
drop policy if exists "Users can only see their own business" on public.businesses;
drop policy if exists "Users can read own businesses" on public.businesses;
drop policy if exists "Users can update own businesses" on public.businesses;
drop policy if exists "Users can delete own businesses" on public.businesses;
drop policy if exists "Users can insert businesses" on public.businesses;

drop policy if exists "Authenticated users can read conversations" on public.conversations;
drop policy if exists "Users can read conversations of their businesses" on public.conversations;
drop policy if exists "Users can delete conversations of their businesses" on public.conversations;

drop policy if exists "Users can only see their own documents" on public.documents;
drop policy if exists "Users can read documents of their businesses" on public.documents;
drop policy if exists "Users can insert documents to their businesses" on public.documents;

drop policy if exists "Customers can read own messages" on public.customer_messages;
drop policy if exists "Customers can mark own messages read" on public.customer_messages;

-- A signed-in user may only read rows belonging to a business they own.
create policy "Users can read own businesses"
  on public.businesses
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read conversations of their businesses"
  on public.conversations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses
      where businesses.id = conversations.business_id
        and businesses.user_id = (select auth.uid())
    )
  );

create policy "Users can read documents of their businesses"
  on public.documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses
      where businesses.id = documents.business_id
        and businesses.user_id = (select auth.uid())
    )
  );

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

commit;
