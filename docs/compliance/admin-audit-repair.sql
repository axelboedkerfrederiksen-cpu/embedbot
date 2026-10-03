-- Targeted production repair for the missing admin audit table.
-- Review before execution. No existing records are changed or deleted.
begin;
create table public.compliance_audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid references auth.users(id) on delete set null,
 business_id uuid references public.businesses(id) on delete set null,
 action text not null,
 record_count integer check(record_count >= 0),
 document_slug text,
 document_version text,
 created_at timestamptz not null default now(),
 check(action in ('terms.accept','dpa.accept','account.export','account.delete','visitor.search','visitor.export','visitor.delete','conversation.delete','integration.create','integration.delete','integration.settings','admin.read','admin.mutate','privacy.update','trial.start'))
);
create index compliance_audit_events_retention_idx on public.compliance_audit_events(created_at);
alter table public.compliance_audit_events enable row level security;
revoke all on public.compliance_audit_events from public, anon, authenticated;
grant all on public.compliance_audit_events to service_role;
commit;
