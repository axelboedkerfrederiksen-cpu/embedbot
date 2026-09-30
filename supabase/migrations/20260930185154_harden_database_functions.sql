begin;

-- These RPCs are only called by server-side code using the service role.
revoke all on function public.enforce_chat_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.enforce_chat_rate_limit(text, integer, integer) to service_role;

revoke all on function public.match_documents(public.vector, uuid, integer) from public, anon, authenticated;
grant execute on function public.match_documents(public.vector, uuid, integer) to service_role;
alter function public.match_documents(public.vector, uuid, integer) set search_path = public;

-- Trigger helpers must not be exposed as public RPC endpoints.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

-- Cover the ownership lookups used by dashboard queries and RLS policies.
create index if not exists businesses_user_id_idx
  on public.businesses (user_id);

create index if not exists conversations_business_id_idx
  on public.conversations (business_id);

create index if not exists documents_business_id_idx
  on public.documents (business_id);

commit;
