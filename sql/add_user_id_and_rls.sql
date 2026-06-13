-- CRITICAL SECURITY FIX: Add user_id to businesses table and implement proper RLS
-- This migration adds ownership-based Row Level Security to prevent data leakage
-- Idempotent: Can be run multiple times safely

-- 1. Add user_id column to businesses table (if not already present)
alter table public.businesses 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2. Create index on user_id for performance
create index if not exists businesses_user_id_idx on public.businesses (user_id);

-- 3. Enable RLS if not already enabled
alter table public.businesses enable row level security;
alter table public.documents enable row level security;

-- 4. Drop old overly-permissive policies
drop policy if exists "Authenticated users can read conversations" on public.conversations;

-- 5. Drop existing policies before recreating (idempotent)
drop policy if exists "Users can read own businesses" on public.businesses;
drop policy if exists "Users can update own businesses" on public.businesses;
drop policy if exists "Users can delete own businesses" on public.businesses;
drop policy if exists "Users can insert businesses" on public.businesses;

drop policy if exists "Users can read documents of their businesses" on public.documents;
drop policy if exists "Users can insert documents to their businesses" on public.documents;

drop policy if exists "Users can read conversations of their businesses" on public.conversations;
drop policy if exists "Users can delete conversations of their businesses" on public.conversations;

-- 6. Create proper ownership-based RLS policies

-- Businesses: Users can read only their own businesses
create policy "Users can read own businesses"
  on public.businesses
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Businesses: Users can update only their own businesses
create policy "Users can update own businesses"
  on public.businesses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Businesses: Users can delete only their own businesses
create policy "Users can delete own businesses"
  on public.businesses
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Businesses: Users can insert businesses only for themselves
create policy "Users can insert businesses"
  on public.businesses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Documents: Users can read documents of their businesses only
create policy "Users can read documents of their businesses"
  on public.documents
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses
      where id = documents.business_id
      and user_id = auth.uid()
    )
  );

-- Documents: Users can insert documents only to their businesses
create policy "Users can insert documents to their businesses"
  on public.documents
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses
      where id = business_id
      and user_id = auth.uid()
    )
  );

-- Conversations: Users can read conversations of their businesses only
create policy "Users can read conversations of their businesses"
  on public.conversations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses
      where id = conversations.business_id
      and user_id = auth.uid()
    )
  );

-- Conversations: Users can delete conversations of their businesses only
create policy "Users can delete conversations of their businesses"
  on public.conversations
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.businesses
      where id = conversations.business_id
      and user_id = auth.uid()
    )
  );
