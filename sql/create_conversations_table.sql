-- Run this in Supabase SQL Editor
-- Creates the conversations table used by /dashboard/[id]/samtaler

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  messages jsonb not null default '[]'::jsonb
);

alter table public.conversations enable row level security;

-- NOTE:
-- Your current businesses schema has no user_id, so ownership-based RLS on conversations
-- cannot be enforced yet. This policy allows authenticated users to read for now.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversations'
      and policyname = 'Authenticated users can read conversations'
  ) then
    create policy "Authenticated users can read conversations"
      on public.conversations
      for select
      to authenticated
      using (true);
  end if;
end
$$;
