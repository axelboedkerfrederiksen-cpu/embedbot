-- GDPR Compliance: Add data retention and deletion support
-- Idempotent: Can be run multiple times safely

-- 1. Add retention settings to businesses table
alter table public.businesses
add column if not exists retention_days integer default 90,
add column if not exists deleted_at timestamptz,
add column if not exists is_deleted boolean default false;

-- 2. Add soft delete support to conversations
alter table public.conversations
add column if not exists deleted_at timestamptz,
add column if not exists is_deleted boolean default false;

-- 3. Create indexes for performance
create index if not exists businesses_deleted_at_idx on public.businesses (deleted_at);
create index if not exists businesses_is_deleted_idx on public.businesses (is_deleted);
create index if not exists conversations_deleted_at_idx on public.conversations (deleted_at);
create index if not exists conversations_is_deleted_idx on public.conversations (is_deleted);

-- 4. Update RLS policies to exclude soft-deleted records (idempotent)
drop policy if exists "Users can read own businesses" on public.businesses;
create policy "Users can read own businesses"
  on public.businesses
  for select
  to authenticated
  using (auth.uid() = user_id and not is_deleted);

drop policy if exists "Users can read conversations of their businesses" on public.conversations;
create policy "Users can read conversations of their businesses"
  on public.conversations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses
      where id = conversations.business_id
      and user_id = auth.uid()
      and not is_deleted
    )
    and not conversations.is_deleted
  );

-- 5. Create cleanup function for expired data (idempotent with create or replace)
create or replace function public.cleanup_expired_conversations()
returns table(deleted_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count bigint := 0;
begin
  -- Mark conversations as deleted if they exceed retention period
  update public.conversations
  set deleted_at = now(),
      is_deleted = true
  where not is_deleted
    and exists (
      select 1 from public.businesses
      where id = conversations.business_id
        and retention_days is not null
        and created_at <= now() - (retention_days || ' days')::interval
    );

  get diagnostics v_deleted_count = row_count;
  return query select v_deleted_count;
end;
$$;

-- 6. Create function to delete user account (idempotent with create or replace)
create or replace function public.delete_user_account(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_success boolean := false;
begin
  if auth.uid() != user_id then
    raise exception 'Cannot delete another users account';
  end if;

  -- Mark all businesses as deleted
  update public.businesses
  set is_deleted = true,
      deleted_at = now()
  where user_id = delete_user_account.user_id;

  -- Delete all conversations
  delete from public.conversations
  where business_id in (
    select id from public.businesses
    where user_id = delete_user_account.user_id
  );

  -- Delete all documents
  delete from public.documents
  where business_id in (
    select id from public.businesses
    where user_id = delete_user_account.user_id
  );

  v_success := true;
  return v_success;
end;
$$;

-- 7. Create function to export user data (idempotent with create or replace)
create or replace function public.export_user_data(user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_data jsonb;
  v_businesses jsonb;
  v_conversations jsonb;
begin
  if auth.uid() != user_id then
    raise exception 'Cannot export another users data';
  end if;

  -- Get all businesses
  select jsonb_agg(to_jsonb(b))
  into v_businesses
  from public.businesses b
  where user_id = export_user_data.user_id
    and not is_deleted;

  -- Get all conversations
  select jsonb_agg(to_jsonb(c))
  into v_conversations
  from public.conversations c
  where business_id in (
    select id from public.businesses
    where user_id = export_user_data.user_id
  )
  and not is_deleted;

  v_user_data := jsonb_build_object(
    'user_id', user_id,
    'exported_at', now(),
    'businesses', coalesce(v_businesses, '[]'::jsonb),
    'conversations', coalesce(v_conversations, '[]'::jsonb)
  );

  return v_user_data;
end;
$$;
