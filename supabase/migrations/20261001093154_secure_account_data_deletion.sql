begin;

-- Delete all application data for an authenticated account in one transaction.
-- The API verifies the user first and invokes this function with the service role.
-- SECURITY INVOKER keeps the function from acquiring privileges of its owner.
create or replace function public.delete_embedbot_account_data(
  target_user_id uuid,
  target_email text default null
)
returns table(
  deleted_businesses bigint,
  deleted_support_messages bigint
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  business_count bigint := 0;
  support_count bigint := 0;
begin
  delete from public.documents
  where business_id in (
    select id
    from public.businesses
    where user_id = target_user_id
  );

  with deleted as (
    delete from public.businesses
    where user_id = target_user_id
    returning id
  )
  select count(*)::bigint into business_count from deleted;

  if target_email is not null and length(trim(target_email)) > 0 then
    with deleted as (
      delete from public.support_messages
      where lower(email) = lower(trim(target_email))
      returning id
    )
    select count(*)::bigint into support_count from deleted;
  end if;

  return query select business_count, support_count;
end;
$function$;

comment on function public.delete_embedbot_account_data(uuid, text) is
  'Permanently deletes application data owned by one EmbedBot account. Auth deletion is performed separately by the server.';

revoke all on function public.delete_embedbot_account_data(uuid, text)
  from public, anon, authenticated;
grant execute on function public.delete_embedbot_account_data(uuid, text)
  to service_role;

commit;
