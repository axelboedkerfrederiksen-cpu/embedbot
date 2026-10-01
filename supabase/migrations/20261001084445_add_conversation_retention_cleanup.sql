begin;

-- The daily retention job joins conversations to their owning business and
-- checks the conversation creation time. This index keeps that scan bounded as
-- the number of conversations grows.
create index if not exists conversations_retention_cleanup_idx
  on public.conversations (business_id, created_at);

-- Permanently remove chat content once the configured retention period has
-- elapsed. Conversations or businesses that were manually soft-deleted are
-- also purged by the next daily run.
--
-- The function intentionally uses the caller's privileges. The server invokes
-- it with the service role; browser roles are explicitly denied below.
create or replace function public.cleanup_expired_conversations()
returns table(deleted_count bigint)
language sql
security invoker
set search_path = ''
as $function$
  with deleted as (
    delete from public.conversations as conversation
    using public.businesses as business
    where business.id = conversation.business_id
      and (
        coalesce(conversation.is_deleted, false)
        or coalesce(business.is_deleted, false)
        or (
          business.retention_days is not null
          and business.retention_days > 0
          and conversation.created_at <=
            now() - make_interval(days => business.retention_days)
        )
      )
    returning conversation.id
  )
  select count(*)::bigint as deleted_count
  from deleted;
$function$;

comment on function public.cleanup_expired_conversations() is
  'Permanently deletes conversations past their business retention period or previously marked for deletion.';

revoke all on function public.cleanup_expired_conversations()
  from public, anon, authenticated;
grant execute on function public.cleanup_expired_conversations()
  to service_role;

commit;
