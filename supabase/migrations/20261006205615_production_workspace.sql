begin;
create table public.workspace_settings (
 business_id uuid primary key references public.businesses(id) on delete cascade,
 revision bigint not null default 0,
 state jsonb not null check (jsonb_typeof(state)='object' and octet_length(state::text)<=2000000),
 updated_at timestamptz not null default now()
);
create table public.workspace_feedback (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade unique,
 value text not null check (value in ('yes','no')),
 note text not null default '' check (length(note)<=500),
 created_at timestamptz not null default now()
);
create index workspace_feedback_business on public.workspace_feedback(business_id);
create table public.workspace_leads (
 id uuid primary key,
 business_id uuid not null references public.businesses(id) on delete cascade,
 ticket_id uuid not null references public.commerce_tickets(id) on delete cascade,
 submission_key text not null,
 data jsonb not null check(octet_length(data::text)<=10000),
 created_at timestamptz not null default now(),
 unique(business_id,submission_key)
);
create index workspace_leads_business on public.workspace_leads(business_id);
create index workspace_leads_ticket on public.workspace_leads(ticket_id);
create table public.workspace_ticket_entries (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 ticket_id uuid not null references public.commerce_tickets(id) on delete cascade,
 kind text not null check(kind in ('note','reply')),
 text text not null check(length(text) between 1 and 4000),
 delivery_status text not null default 'pending' check(delivery_status in ('pending','sent','failed','note')),
 attempts integer not null default 0,
 attempted_at timestamptz,
 created_at timestamptz not null default now()
);
create index workspace_entries_business on public.workspace_ticket_entries(business_id);
create index workspace_entries_ticket on public.workspace_ticket_entries(ticket_id);
create table public.workspace_activity (
 business_id uuid primary key references public.businesses(id) on delete cascade,
 last_seen_at timestamptz,
 page text check(length(page)<=200),
 clicks jsonb not null default '{}'
);
-- The server verifies auth and ownership on every private request. None of
-- these records is exposed through the anonymous/authenticated Data API.
alter table public.workspace_settings enable row level security;
alter table public.workspace_feedback enable row level security;
alter table public.workspace_leads enable row level security;
alter table public.workspace_ticket_entries enable row level security;
alter table public.workspace_activity enable row level security;
revoke all on public.workspace_settings,public.workspace_feedback,public.workspace_leads,public.workspace_ticket_entries,public.workspace_activity from public,anon,authenticated;
grant all on public.workspace_settings,public.workspace_feedback,public.workspace_leads,public.workspace_ticket_entries,public.workspace_activity to service_role;

create function public.save_workspace_settings(p_business_id uuid,p_revision bigint,p_state jsonb,p_brand boolean default false)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.businesses where id=p_business_id and not coalesce(is_deleted,false)) then return false; end if;
 if p_revision=-1 then
  insert into public.workspace_settings(business_id,state,revision) values(p_business_id,p_state,1) on conflict do nothing;
 else
  update public.workspace_settings set state=p_state,revision=revision+1,updated_at=now() where business_id=p_business_id and revision=p_revision;
 end if;
 if not found then return false; end if;
 if p_brand then update public.businesses set name=p_state->>'name',welcome_message=p_state->>'welcome' where id=p_business_id; end if;
 update public.workspace_activity set clicks=(select coalesce(jsonb_object_agg(e.key,e.value),'{}') from jsonb_each(clicks)e where exists(select 1 from jsonb_array_elements(p_state->'starters') s where s->>'id'=e.key)) where business_id=p_business_id;
 return true;
end $$;
create function public.workspace_activity_event(p_business_id uuid,p_page text,p_starter text default null)
returns void language plpgsql security invoker set search_path='' as $$
begin
 insert into public.workspace_activity(business_id,last_seen_at,page) values(p_business_id,now(),left(p_page,200))
 on conflict(business_id) do update set last_seen_at=excluded.last_seen_at,page=excluded.page;
 if p_starter is not null and exists(select 1 from public.workspace_settings w,jsonb_array_elements(w.state->'starters')s where w.business_id=p_business_id and s->>'id'=p_starter) then
 update public.workspace_activity set clicks=jsonb_set(clicks,array[p_starter],to_jsonb(coalesce((clicks->>p_starter)::integer,0)+1)) where business_id=p_business_id;
 end if;
end $$;
create function public.create_workspace_lead(p_business_id uuid,p_submission_key text,p_data jsonb,p_notification_email text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare lead_id uuid; ticket_id uuid;
begin
 perform 1 from public.businesses where id=p_business_id and not coalesce(is_deleted,false) for update;
 if not found then raise exception 'business_unavailable'; end if;
 select id into lead_id from public.workspace_leads where business_id=p_business_id and submission_key=p_submission_key;
 if found then return lead_id; end if;
 insert into public.commerce_tickets(business_id,submission_key,contact_email,description,notification_email,notification_status)
 values(p_business_id,'quote:'||p_submission_key,p_data->>'email',p_data->>'need',p_notification_email,case when p_notification_email is null then 'not_configured' else 'pending' end) returning id into ticket_id;
 lead_id=gen_random_uuid();
 insert into public.workspace_leads(id,business_id,ticket_id,submission_key,data) values(lead_id,p_business_id,ticket_id,p_submission_key,p_data);
 return lead_id;
end $$;
revoke all on function public.save_workspace_settings(uuid,bigint,jsonb,boolean),public.workspace_activity_event(uuid,text,text),public.create_workspace_lead(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_workspace_settings(uuid,bigint,jsonb,boolean),public.workspace_activity_event(uuid,text,text),public.create_workspace_lead(uuid,text,jsonb,text) to service_role;
create function public.cleanup_workspace() returns integer language plpgsql security invoker set search_path='' as $$
declare n integer;begin
 delete from public.workspace_feedback f using public.conversations c where f.conversation_id=c.id and coalesce(c.is_deleted,false);get diagnostics n=row_count;
 delete from public.workspace_settings w using public.businesses b where w.business_id=b.id and coalesce(b.is_deleted,false);
 delete from public.workspace_activity w using public.businesses b where w.business_id=b.id and (coalesce(b.is_deleted,false) or w.last_seen_at<now()-interval '90 days');
 return n;
end $$;
revoke all on function public.cleanup_workspace() from public,anon,authenticated;
grant execute on function public.cleanup_workspace() to service_role;

create or replace function public.visitor_records(p_business_id uuid,p_actor uuid,p_kind text,p_value text,p_after_kind text default '',p_after_id uuid default '00000000-0000-0000-0000-000000000000',p_limit integer default 500)
returns table(kind text,id uuid,record jsonb)
language plpgsql security invoker set search_path='' as $$ begin
 perform public.compliance_assert_owner(p_business_id,p_actor);
 if p_kind not in ('email','conversation') or length(p_value)>320 or p_value='' then raise exception 'invalid_selector'; end if;
 return query select r.kind,r.id,r.record from (
 select 'conversation'::text kind,c.id,to_jsonb(c)||jsonb_build_object('feedback',(select jsonb_agg(to_jsonb(f)) from public.workspace_feedback f where f.conversation_id=c.id and f.business_id=p_business_id)) record from public.conversations c where c.business_id=p_business_id and
 ((p_kind='conversation' and c.id::text=p_value) or (p_kind='email' and public.compliance_has_email(c.messages,p_value)))
 union all
 select 'ticket',t.id,(to_jsonb(t)-'submission_key'-'notification_provider_id')||jsonb_build_object('leads',(select jsonb_agg(to_jsonb(l)-'submission_key') from public.workspace_leads l where l.ticket_id=t.id and l.business_id=p_business_id),'entries',(select jsonb_agg(to_jsonb(e)) from public.workspace_ticket_entries e where e.ticket_id=t.id and e.business_id=p_business_id)) from public.commerce_tickets t where t.business_id=p_business_id and
 ((p_kind='conversation' and case when p_kind='conversation' then p_value::uuid=any(t.conversation_ids) else false end) or (p_kind='email' and (lower(t.contact_email)=lower(p_value) or public.compliance_has_email(t.context,p_value) or public.compliance_has_email(to_jsonb(t.description),p_value))))
 ) r where (r.kind,r.id)>(p_after_kind,p_after_id) order by r.kind,r.id limit least(greatest(p_limit,1),500);
end $$;
revoke all on function public.visitor_records(uuid,uuid,text,text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.visitor_records(uuid,uuid,text,text,text,uuid,integer) to service_role;
commit;
