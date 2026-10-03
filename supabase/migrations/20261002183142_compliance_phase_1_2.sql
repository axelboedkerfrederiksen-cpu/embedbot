begin;
create table public.business_privacy_settings (
 business_id uuid primary key references public.businesses(id) on delete cascade,
 customer_privacy_url text check (customer_privacy_url is null or customer_privacy_url ~ '^https://[^[:space:]]+$'),
 ticket_retention_days integer not null default 90 check(ticket_retention_days between 1 and 3650),
 updated_at timestamptz not null default now()
);
create table public.legal_document_versions (
 slug text not null check(slug in ('terms','dpa')), version text not null,
 status text not null check(status in ('draft','published')), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 document jsonb not null, created_at timestamptz not null default now(), primary key(slug,version)
);
create table public.legal_acceptances (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 slug text not null, version text not null, accepted_at timestamptz not null default now(),
 accepted_by uuid references auth.users(id) on delete set null,
 foreign key(slug,version) references public.legal_document_versions(slug,version), unique(business_id,slug,version)
);
create table public.compliance_audit_events (
 id uuid primary key default gen_random_uuid(), actor_user_id uuid references auth.users(id) on delete set null,
 business_id uuid references public.businesses(id) on delete set null, action text not null,
 record_count integer check(record_count >= 0), document_slug text, document_version text,
 created_at timestamptz not null default now(),
 check(action in ('terms.accept','dpa.accept','account.export','account.delete','visitor.search','visitor.export','visitor.delete','conversation.delete','integration.create','integration.delete','integration.settings','admin.read','admin.mutate','privacy.update','trial.start'))
);
create table public.maintenance_runs (
 id uuid primary key default gen_random_uuid(), job text not null check(job in ('cleanup','support')),
 status text not null check(status in ('started','completed','failed')), started_at timestamptz not null default now(),
 completed_at timestamptz, counts jsonb not null default '{}', failure_code text check(failure_code is null or failure_code in ('job_failed'))
);
-- Unresolved periods intentionally remain NULL: no legal retention is invented.
create table public.compliance_retention_config (
 singleton boolean primary key default true check(singleton), support_message_days integer check(support_message_days > 0),
 customer_message_days integer check(customer_message_days > 0), audit_days integer check(audit_days > 0),
 maintenance_days integer check(maintenance_days > 0)
);
insert into public.compliance_retention_config(singleton) values(true);
alter table public.commerce_tickets add column conversation_ids uuid[] not null default '{}';
create index commerce_tickets_retention_idx on public.commerce_tickets(business_id,created_at);
create index compliance_audit_events_retention_idx on public.compliance_audit_events(created_at);
create index legal_acceptances_business_idx on public.legal_acceptances(business_id);
insert into public.legal_document_versions (slug,version,status,sha256,document) values ('terms','2026-10-02.1','published','b106970f4f04f330531389610e878a92db071270cbaa67350bf5f28b50e368da','{"slug": "terms", "version": "2026-10-02.1", "status": "published", "title": "Vilkår for EmbedBot", "notice": "Vilkårene er versionsregistreret. Juridisk gennemgang og bekræftelse af aftalepartens officielle oplysninger udestår.", "sections": [{"title": "1. Aftalen", "text": "Disse vilkår gælder for virksomhedens brug af EmbedBot, herunder dashboard, chatbot-widget, support, pilot og betalte abonnementer. Aftalen indgås med EmbedBot / Axel Bødker Frederiksen, e-mail axel@embedbot.dk , telefon +45 91 55 12 50 ."}, {"title": "2. Tjenesten", "text": "EmbedBot leverer en AI-baseret chatbot, som kan bruge virksomhedens egne oplysninger og websiteindhold til at besvare besøgendes spørgsmål. Funktioner, kapacitet og inkluderede AI-svar afhænger af den valgte plan. Vi kan foretage rimelige produktændringer, når tjenestens væsentlige funktion ikke forringes væsentligt."}, {"title": "3. Pilot", "text": "Prøveperioden er 14 dage uden betalingskort. Den bliver ikke automatisk til et betalt abonnement. Ved udløb stopper chatbotadgangen, indtil virksomheden aktivt køber en plan. Betalte abonnementer fornyes månedligt, indtil de opsiges."}, {"title": "4. Pris, betaling og fornyelse", "text": "Aktuelle priser og plangrænser fremgår af prissiden . Priser er i danske kroner pr. måned og eksklusive moms, medmindre andet er angivet. Betaling håndteres af Stripe. Et betalt abonnement fornyes automatisk månedligt, indtil det opsiges. Den valgte pris, betalingsperiode og fornyelse vises før betaling. Virksomheden kan opsige i dashboardet; opsigelsen gælder ved udgangen af den allerede betalte periode. Se betalings- og refusionspolitikken ."}, {"title": "5. Konto og adgang", "text": "Virksomheden skal give korrekte oplysninger, beskytte loginoplysninger og straks kontakte os ved mistanke om misbrug. Virksomheden er ansvarlig for handlinger foretaget fra dens konto, medmindre de skyldes forhold, som EmbedBot er ansvarlig for."}, {"title": "6. Virksomhedens indhold og instruktioner", "text": "Virksomheden beholder sine rettigheder til indhold, som den leverer. Virksomheden giver EmbedBot en begrænset ret til at behandle indholdet for at levere, sikre og supportere tjenesten. Virksomheden er ansvarlig for, at den har ret til at bruge og dele indholdet, og for at produkt-, pris-, leverings-, retur-, garanti- og kontaktoplysninger er korrekte. Virksomheden skal gennemgå væsentlige chatbot-svar og må ikke instruere chatbotten i at vildlede kunder eller overtræde lovgivning."}, {"title": "7. Personoplysninger", "text": "Når EmbedBot behandler virksomhedens besøgendes oplysninger efter virksomhedens instruktioner, er virksomheden normalt dataansvarlig og EmbedBot databehandler. Virksomheden skal give de nødvendige oplysninger til sine besøgende, vælge et lovligt behandlingsgrundlag og undgå at indsamle flere oplysninger end nødvendigt. En databehandleraftale skal være indgået, før EmbedBot bruges til at behandle besøgendes personoplysninger på virksomhedens vegne. Se privatlivspolitikken og cookiepolitikken ."}, {"title": "8. Børn og følsomme oplysninger", "text": "Tjenesten er ikke målrettet børn. Virksomheden må ikke målrette chatbotten mod børn eller indsamle børns oplysninger på grundlag af samtykke uden selv at sikre et gyldigt alders- og forældresamtykkeforløb. Chatbotten bør ikke bruges til CPR-numre, helbredsoplysninger, betalingskortoplysninger eller andre følsomme oplysninger, medmindre det er særskilt aftalt og lovligt."}, {"title": "9. Acceptabel brug", "text": "EmbedBot må ikke bruges til ulovligt indhold, spam, phishing, chikane, malware, krænkelse af tredjemands rettigheder, omgåelse af sikkerhed eller belastning af tjenesten ud over normal brug. Sikkerhedsforanstaltninger må ikke testes uden skriftlig tilladelse."}, {"title": "10. AI-begrænsninger", "text": "AI-genererede svar kan være ufuldstændige eller forkerte. EmbedBot bruger tekniske og instruktionelle sikkerhedsforanstaltninger, men kan ikke garantere, at alle fejl, manipulationer eller prompt-injection-forsøg bliver opdaget. Chatbotten må ikke være eneste grundlag for juridisk, medicinsk, finansiel eller anden højrisikorådgivning."}, {"title": "11. Tredjeparter", "text": "Tjenesten anvender blandt andet OpenAI, Supabase, Stripe, Resend, Vercel og Plausible. Driftsforstyrrelser eller ændringer hos disse leverandører kan påvirke tjenesten. Vi vælger og administrerer leverandører med rimelig omhu, men kan ikke kontrollere deres tjenester fuldt ud."}, {"title": "12. Tilgængelighed, support og sikkerhed", "text": "Vi tilstræber stabil drift og rimelig support, men lover ikke uafbrudt eller fejlfri adgang. Planlagt vedligeholdelse, sikkerhedshændelser eller forhold uden for vores kontrol kan give afbrydelser. Vi anvender rimelige tekniske og organisatoriske sikkerhedsforanstaltninger."}, {"title": "13. Suspension og ophør", "text": "Vi kan suspendere adgang ved manglende betaling, væsentlig misligholdelse, sikkerhedsrisiko eller ulovlig brug. Hvor det er rimeligt, giver vi mulighed for at rette forholdet først. Ved ophør bør virksomheden eksportere nødvendige data. Sletning og opbevaring følger privatlivspolitikken og gældende lov."}, {"title": "14. Ansvar", "text": "Parterne er ansvarlige efter dansk rets almindelige regler med de begrænsninger, der lovligt kan aftales mellem erhvervsdrivende. EmbedBot er ikke ansvarlig for indirekte tab, driftstab, tabt avance eller tab, der skyldes virksomhedens urigtige indhold eller brug af AI-svar uden relevant kontrol. EmbedBots samlede ansvar er, i det omfang loven tillader det, begrænset til det beløb, virksomheden har betalt for tjenesten i de seneste 12 måneder. Begrænsningen gælder ikke ved forsæt, grov uagtsomhed eller ansvar, som ikke lovligt kan begrænses."}, {"title": "15. Ændringer", "text": "Væsentlige ændringer til priser eller vilkår varsles normalt mindst 30 dage før ikrafttræden. Hvis en ændring har væsentlig negativ betydning, kan virksomheden opsige abonnementet inden ændringen træder i kraft."}, {"title": "16. Lovvalg og kontakt", "text": "Aftalen er underlagt dansk ret. Tvister søges først løst i dialog og kan derefter indbringes for de danske domstole efter de almindelige værnetingsregler. Spørgsmål kan sendes til axel@embedbot.dk eller via support ."}], "suppliers": [], "sha256": "b106970f4f04f330531389610e878a92db071270cbaa67350bf5f28b50e368da"}'::jsonb);
insert into public.legal_document_versions (slug,version,status,sha256,document) values ('dpa','2026-10-02.draft-1','draft','50a5724956c21bc1b86dd4c3fa9960ab7f5e20bb51e4b7ef74e043590ac6ac6a','{"slug": "dpa", "version": "2026-10-02.draft-1", "status": "draft", "title": "Databehandleraftale — udkast", "notice": "UDKAST — ikke juridisk godkendt og kan ikke accepteres i systemet. Parternes oplysninger, underdatabehandlere, overførsler og bilag kræver review og Axels udtrykkelige godkendelse.", "sections": [{"title": "1. Parterne", "text": "Dataansvarlig: kundens officielle juridiske navn, CVR/registrering, adresse og kontakt skal udfyldes. Databehandler: EmbedBots officielle juridiske navn, registrering, adresse og kontakt skal bekræftes af Axel. Kontakten axel@embedbot.dk fremgår af den eksisterende hjemmeside; den er ikke dokumentation for en juridisk enhed."}, {"title": "2. Genstand og varighed", "text": "Levering af website-chatbot, dashboard, vidensindlæsning og valgfrie webshop- og supportfunktioner. Behandling under kundens aktive brug og frem til aftalt returnering/sletning. Ophørsfrist og backuphåndtering skal aftales før endelig version."}, {"title": "3. Karakter og formål", "text": "Modtagelse, lagring, søgning og generering af AI-svar på kundens oplysninger; formidling af besøgendes spørgsmål og supportsager. Ordreopslag sker gennem kundens tilsluttede webshop med separat verifikation. Ingen tilsigtet profilering eller afgørelser med retsvirkning."}, {"title": "4. Datatyper og registrerede", "text": "Besøgende og kundens medarbejdere: chattekst, frivillige kontaktoplysninger, supportsagsbeskrivelse og valgfrit samtaleudsnit. Webshopordre: ordre-reference, email og begrænsede ordre/statusoplysninger. Videnskilder kan indeholde persondata og skal minimeres. Konto-, betalings- og egen supportbehandling vurderes særskilt som EmbedBots mulige dataansvar."}, {"title": "5. Dokumenterede instrukser", "text": "Behandling alene efter dokumenterede instrukser i aftalen og kundens autoriserede dashboardvalg. Kunden bekræfter lovligt grundlag og korrekt besøgsinformation. EmbedBot gør opmærksom på instrukser, der vurderes ulovlige, og en eskalationsproces aftales. Nye formål kræver særskilt aftale."}, {"title": "6. Fortrolighed", "text": "Kun autoriserede personer med nødvendigt behov må få adgang. Bindende fortrolighedsforpligtelser og oplæring skal etableres og dokumenteres. Personale- og leverandørforpligtelser er ikke verificeret af kode."}, {"title": "7. Bilag: sikkerhed", "text": "Verificeret i implementation: servervalideret login og ejerskab, tenant-filtre og RLS, serverbegrænsede commerce-tabeller, kryptering af webshopcredentials og ordrelokatorer, tidsbegrænset verifikation, rate limiting, Origin-kontrol på dashboardændringer, hemmeligheder via miljøvariable og begrænset auditlog. Infrastrukturkryptering, backup, restore, leverandøradgang og drift skal verificeres separat."}, {"title": "8. Underdatabehandlere", "text": "Fælles leverandøroversigt findes på /subprocessors. Juridiske enheder, rollefordeling og aftaler skal bekræftes. Procedure for varsling, indsigelser og udskiftning skal aftales; dette udkast er ikke generel godkendelse af leverandører."}, {"title": "9. Internationale overførsler", "text": "Ingen data residency, SCC- eller DPF-status antages. Faktiske modtagere, lande, supportadgang, videreoverførsler og relevant overførselsgrundlag skal verificeres og dokumenteres før endelig aftale."}, {"title": "10. Assistance ved rettigheder", "text": "Autoriseret kunde kan eksportere kontodata og søge, eksportere og slette besøgsdata inden for egen virksomhed. Kunden verificerer identitet og afgør anmodningen. Historiske samtaleudsnit uden reference og oplysninger hos andre modtagere kræver manuel gennemgang. Rettelse/begrænsning eskaleres til support."}, {"title": "11. Assistance ved sikkerhedsbrud", "text": "EmbedBot skal orientere kunden uden unødig forsinkelse efter at være blevet bekendt med et persondatabrud i kundens behandling og give tilgængelige oplysninger, risikovurdering, afværgning og opfølgning. Kontaktvej, bemanding og samarbejde skal fastlægges."}, {"title": "12. Assistance ved vurderinger", "text": "Relevant information og rimelig bistand til kundens vurdering af sikkerhed, konsekvensanalyse og eventuel forudgående høring. Omfang og praktisk samarbejde skal aftales. Ingen automatisk konklusion om, hvorvidt en DPIA er nødvendig."}, {"title": "13. Bilag: retention", "text": "Samtaler følger kundens positive retention_days; eksisterende teknisk standard er 90 dage. Supportsager får samme tekniske standard på 90 dage med særskilt indstilling. Kopieret chatkontekst ryddes senest efter samtaleretention og ved tilknyttet samtales sletning. Challenges og forbindelsesforsøg slettes efter deres udløb. Disse perioder kræver menneskelig godkendelse som behandlingsinstruks."}, {"title": "14. Returnering og sletning ved ophør", "text": "Kunden kan eksportere relevante data før kontosletning. Serverens kontosletning fjerner tilknyttede virksomhedsdata og login; separate retskrav, auditopbevaring, leverandørkopier og backups skal afklares. Kunden vælger returnering/sletning i den endelige aftale."}, {"title": "15. Audit og kontrol", "text": "Databehandleren stiller nødvendig information om opfyldelsen til rådighed og bidrager til kontroller efter artikel 28. Praktisk proces, varsel, fortrolighed og adgang til dokumentation skal aftales uden at begrænse lovbestemte rettigheder."}, {"title": "16. Kontakt og eskalation", "text": "Eksisterende kontakt: axel@embedbot.dk. Kundens kontakt, sikkerhedskontakt, stedfortræder og eventuelle databeskyttelsesrådgivere skal udfyldes og verificeres. Der er ikke antaget en døgnbemandet beredskabsordning."}, {"title": "17. Version og godkendelse", "text": "Udkastet arkiveres med versionsnummer og indholdshash. Kun en separat, udtrykkeligt godkendt publiceret version kan accepteres af en autentificeret virksomhedsejer. Accept gemmer virksomhed, bruger, version og tidspunkt; ingen IP/user agent. Eksisterende kunder får ikke automatisk accept."}], "suppliers": [{"provider": "Supabase", "service": "Database og Auth", "purpose": "Konto, chat, supportsager, videnskilder og integrationer", "data": "Konto-/virksomhedsoplysninger, chat og supportsager; krypterede webshopcredentials", "location": "Projektets database-region: eu-central-1 (verificeret 2026-10-02). Auth, logs, backups og supportadgang: Requires verification", "information": "https://supabase.com/privacy", "evidence": "@supabase/ssr, @supabase/supabase-js; projektmetadata", "legalName": "Requires verification", "role": "Requires verification", "transfer": "Requires verification", "addedAt": "Requires verification"}, {"provider": "OpenAI", "service": "AI API", "purpose": "Chatgenerering og embeddings af videnskilder", "data": "Spørgsmål, begrænset historik og udvalgte virksomhedskilder. Private ordreopslag håndteres separat", "information": "https://openai.com/policies/data-processing-addendum/", "evidence": "lib/chatbot.ts og chat-/ingest-routes", "legalName": "Requires verification", "location": "Requires verification", "role": "Requires verification", "transfer": "Requires verification", "addedAt": "Requires verification"}, {"provider": "Vercel", "service": "Hosting, Cron, Web Analytics og Speed Insights", "purpose": "Levering, jobs og samtykkebaseret måling", "data": "HTTP-trafik, serverbehandling og samtykkebaserede besøgs-/ydelsesdata", "information": "https://vercel.com/legal/dpa", "evidence": "vercel.json, Next.js og analytics-komponenten", "legalName": "Requires verification", "location": "Requires verification", "role": "Requires verification", "transfer": "Requires verification", "addedAt": "Requires verification"}, {"provider": "Resend", "service": "Transaktionsmail", "purpose": "Aktivering, support og sagsnotifikation", "data": "Emailadresse og relevant emailindhold, herunder ticketoplysninger", "information": "https://resend.com/legal/dpa", "evidence": "lib/business-activation.ts, lib/commerce/mail.ts", "legalName": "Requires verification", "location": "Requires verification", "role": "Requires verification", "transfer": "Requires verification", "addedAt": "Requires verification"}, {"provider": "Stripe", "service": "Betalte abonnementer", "purpose": "Betaling, abonnement og opsigelse", "data": "Kunde-/virksomhedsreference, email og betalingsoplysninger hos Stripe", "information": "https://stripe.com/legal/dpa", "evidence": "stripe-webhook, billing routes og checkout-links", "legalName": "Requires verification", "location": "Requires verification", "role": "Requires verification", "transfer": "Requires verification", "addedAt": "Requires verification"}, {"provider": "Plausible", "service": "Webanalyse", "purpose": "Samtykkebaseret besøgsmåling", "data": "Sidebesøg og tekniske besøgsoplysninger", "information": "https://plausible.io/data-policy", "evidence": "app/components/cookie-consent.tsx", "legalName": "Requires verification", "location": "Requires verification", "role": "Requires verification", "transfer": "Requires verification", "addedAt": "Requires verification"}], "sha256": "50a5724956c21bc1b86dd4c3fa9960ab7f5e20bb51e4b7ef74e043590ac6ac6a"}'::jsonb);

-- Browser roles cannot forge acceptance, audit or privacy records. All access is
-- through authenticated, owner-scoped server endpoints; no anonymous policies.
do $$ declare t text; begin
 foreach t in array array['business_privacy_settings','legal_document_versions','legal_acceptances','compliance_audit_events','maintenance_runs','compliance_retention_config'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create function public.compliance_assert_owner(p_business_id uuid,p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if p_actor is null or not exists(select 1 from public.businesses where id=p_business_id and user_id=p_actor and not coalesce(is_deleted,false)) then
 raise exception 'not_authorized'; end if;
end $$;
create function public.accept_legal_document(p_business_id uuid,p_actor uuid,p_slug text,p_version text,p_sha256 text)
returns void language plpgsql security invoker set search_path='' as $$ declare inserted_id uuid; begin
 perform public.compliance_assert_owner(p_business_id,p_actor);
 if not exists(select 1 from public.legal_document_versions where slug=p_slug and version=p_version and sha256=p_sha256 and status='published') then raise exception 'document_not_published'; end if;
 insert into public.legal_acceptances(business_id,slug,version,accepted_by) values(p_business_id,p_slug,p_version,p_actor)
 on conflict(business_id,slug,version) do nothing returning id into inserted_id;
 if inserted_id is not null then insert into public.compliance_audit_events(actor_user_id,business_id,action,document_slug,document_version) values(p_actor,p_business_id,p_slug||'.accept',p_slug,p_version); end if;
end $$;
create function public.update_business_privacy(p_business_id uuid,p_actor uuid,p_url text,p_ticket_days integer,p_chat_days integer)
returns void language plpgsql security invoker set search_path='' as $$ begin
 perform public.compliance_assert_owner(p_business_id,p_actor);
 if p_chat_days < 1 or p_chat_days > 3650 then raise exception 'invalid_retention'; end if;
 insert into public.business_privacy_settings(business_id,customer_privacy_url,ticket_retention_days) values(p_business_id,p_url,p_ticket_days)
 on conflict(business_id) do update set customer_privacy_url=excluded.customer_privacy_url,ticket_retention_days=excluded.ticket_retention_days,updated_at=now();
 update public.businesses set retention_days=p_chat_days where id=p_business_id;
 insert into public.compliance_audit_events(actor_user_id,business_id,action) values(p_actor,p_business_id,'privacy.update');
end $$;
-- Copying context into a ticket cannot bypass deletion of the original chat.
create function public.clear_deleted_conversation_context() returns trigger
language plpgsql security invoker set search_path='' as $$ begin
 update public.commerce_tickets set context='[]'::jsonb,conversation_ids='{}',updated_at=now()
 where business_id=old.business_id and old.id=any(conversation_ids);
 return old;
end $$;
create trigger compliance_clear_context before delete on public.conversations for each row execute function public.clear_deleted_conversation_context();
create function public.compliance_cleanup() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb:='{}'; n integer; cfg public.compliance_retention_config%rowtype; begin
 select * into cfg from public.compliance_retention_config where singleton;
 update public.commerce_tickets t set context='[]',conversation_ids='{}',updated_at=now() from public.businesses b
 where t.business_id=b.id and (t.context<>'[]'::jsonb or cardinality(t.conversation_ids)>0)
 and (coalesce(b.is_deleted,false) or t.created_at<=now()-make_interval(days=>coalesce(nullif(b.retention_days,0),90)) or exists(select 1 from public.conversations c where c.business_id=b.id and c.id=any(t.conversation_ids) and (coalesce(c.is_deleted,false) or (b.retention_days>0 and c.created_at<=now()-make_interval(days=>b.retention_days)))));
 get diagnostics n=row_count; result:=result||jsonb_build_object('ticket_contexts_cleared',n);
 delete from public.commerce_tickets t using public.businesses b where t.business_id=b.id
 and (coalesce(b.is_deleted,false) or t.created_at<=now()-make_interval(days=>coalesce((select ticket_retention_days from public.business_privacy_settings where business_id=b.id),90)));
 get diagnostics n=row_count; result:=result||jsonb_build_object('tickets_deleted',n);
 select deleted_count into n from public.cleanup_expired_conversations(); result:=result||jsonb_build_object('conversations_deleted',n);
 delete from public.commerce_order_challenges where expires_at<=now(); get diagnostics n=row_count; result:=result||jsonb_build_object('challenges_deleted',n);
 delete from public.commerce_connection_attempts where expires_at<=now(); get diagnostics n=row_count; result:=result||jsonb_build_object('connection_attempts_deleted',n);
 delete from public.chat_rate_limits where updated_at<=now()-interval '48 hours'; get diagnostics n=row_count; result:=result||jsonb_build_object('rate_limits_deleted',n);
 if cfg.support_message_days is not null then delete from public.support_messages where created_at<=now()-make_interval(days=>cfg.support_message_days); get diagnostics n=row_count; result:=result||jsonb_build_object('support_messages_deleted',n); end if;
 if cfg.customer_message_days is not null then delete from public.customer_messages where created_at<=now()-make_interval(days=>cfg.customer_message_days); get diagnostics n=row_count; result:=result||jsonb_build_object('customer_messages_deleted',n); end if;
 if cfg.audit_days is not null then delete from public.compliance_audit_events where created_at<=now()-make_interval(days=>cfg.audit_days); get diagnostics n=row_count; result:=result||jsonb_build_object('audit_events_deleted',n); end if;
 if cfg.maintenance_days is not null then delete from public.maintenance_runs where started_at<=now()-make_interval(days=>cfg.maintenance_days); get diagnostics n=row_count; result:=result||jsonb_build_object('maintenance_runs_deleted',n); end if;
 return result;
end $$;
-- Extract whole email addresses, never match a substring of somebody else's address.
create function public.compliance_has_email(p_data jsonb,p_email text) returns boolean
language sql immutable security invoker set search_path='' as $$
 select exists(select 1 from regexp_matches(p_data::text,'([[:alnum:]._%+\-]+@[[:alnum:].\-]+\.[[:alpha:]]{2,})','g') m where lower(m[1])=lower(p_email));
$$;
create function public.visitor_records(p_business_id uuid,p_actor uuid,p_kind text,p_value text,p_after_kind text default '',p_after_id uuid default '00000000-0000-0000-0000-000000000000',p_limit integer default 500)
returns table(kind text,id uuid,record jsonb)
language plpgsql security invoker set search_path='' as $$ begin
 perform public.compliance_assert_owner(p_business_id,p_actor);
 if p_kind not in ('email','conversation') or length(p_value)>320 or p_value='' then raise exception 'invalid_selector'; end if;
 return query select r.kind,r.id,r.record from (
 select 'conversation'::text kind,c.id,to_jsonb(c) record from public.conversations c where c.business_id=p_business_id and
 ((p_kind='conversation' and c.id::text=p_value) or (p_kind='email' and public.compliance_has_email(c.messages,p_value)))
 union all
 select 'ticket',t.id,to_jsonb(t)-'submission_key'-'notification_provider_id' from public.commerce_tickets t where t.business_id=p_business_id and
 ((p_kind='conversation' and case when p_kind='conversation' then p_value::uuid=any(t.conversation_ids) else false end) or (p_kind='email' and (lower(t.contact_email)=lower(p_value) or public.compliance_has_email(t.context,p_value) or public.compliance_has_email(to_jsonb(t.description),p_value))))
 ) r where (r.kind,r.id)>(p_after_kind,p_after_id) order by r.kind,r.id limit least(greatest(p_limit,1),500);
end $$;
create function public.delete_visitor_data(p_business_id uuid,p_actor uuid,p_kind text,p_value text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare cids uuid[]:='{}';tids uuid[]:='{}';r record;batch integer;ak text:='';ai uuid:='00000000-0000-0000-0000-000000000000';n integer;total integer:=0;begin
 perform public.compliance_assert_owner(p_business_id,p_actor);
 -- Collect every reference-linked match before deleting chats can clear links.
 loop
  batch:=0;
  for r in select * from public.visitor_records(p_business_id,p_actor,p_kind,p_value,ak,ai,500) loop
   if r.kind='conversation' then cids:=array_append(cids,r.id);else tids:=array_append(tids,r.id);end if;
   ak:=r.kind;ai:=r.id;batch:=batch+1;
  end loop;
  exit when batch<500;
 end loop;
 delete from public.commerce_tickets where business_id=p_business_id and id=any(tids);get diagnostics n=row_count;total:=total+n;
 delete from public.conversations where business_id=p_business_id and id=any(cids);get diagnostics n=row_count;total:=total+n;
 insert into public.compliance_audit_events(actor_user_id,business_id,action,record_count) values(p_actor,p_business_id,'visitor.delete',total);
 return jsonb_build_object('deleted',total);
end $$;
-- Legal archives cannot be modified in place, including by the service client.
create function public.protect_legal_archive() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'create_a_new_document_version'; end $$;
create trigger legal_archive_immutable before update or delete on public.legal_document_versions for each row execute function public.protect_legal_archive();
-- New draft publication therefore requires a NEW reviewed version, never relabeling this draft.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('compliance_assert_owner','accept_legal_document','update_business_privacy','clear_deleted_conversation_context','compliance_cleanup','compliance_has_email','visitor_records','delete_visitor_data','protect_legal_archive') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
create or replace function public.delete_embedbot_account_data(target_user_id uuid,target_email text default null)
returns table(deleted_businesses bigint,deleted_support_messages bigint)
language plpgsql security invoker set search_path='' as $$ declare b bigint; m bigint:=0; begin
 insert into public.compliance_audit_events(actor_user_id,action) values(target_user_id,'account.delete');
 delete from public.documents where business_id in(select id from public.businesses where user_id=target_user_id);
 delete from public.businesses where user_id=target_user_id; get diagnostics b=row_count;
 if target_email is not null then delete from public.support_messages where lower(email)=lower(trim(target_email));get diagnostics m=row_count;end if;
 return query select b,m;
end $$;
revoke all on function public.delete_embedbot_account_data(uuid,text) from public,anon,authenticated;
grant execute on function public.delete_embedbot_account_data(uuid,text) to service_role;
create function public.delete_owner_conversations(p_business_id uuid,p_actor uuid,p_id uuid default null) returns integer
language plpgsql security invoker set search_path='' as $$ declare n integer; begin
 perform public.compliance_assert_owner(p_business_id,p_actor);
 delete from public.conversations where business_id=p_business_id and (p_id is null or id=p_id);get diagnostics n=row_count;
 insert into public.compliance_audit_events(actor_user_id,business_id,action,record_count) values(p_actor,p_business_id,'conversation.delete',n);return n;
end $$;
revoke all on function public.delete_owner_conversations(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_owner_conversations(uuid,uuid,uuid) to service_role;
-- System-side integration changes include OAuth callbacks and are audited in
-- the same transaction. NULL actor honestly denotes a server/background action.
create function public.audit_commerce_change() returns trigger
language plpgsql security invoker set search_path='' as $$ declare a text;begin
 if tg_table_name='commerce_settings' then a:='integration.settings';
 elsif tg_op='DELETE' then if not exists(select 1 from public.businesses where id=old.business_id) then return old;end if;a:='integration.delete';
 elsif tg_op='INSERT' then a:='integration.create';
 elsif new.status='disconnected' and old.status<>'disconnected' then a:='integration.delete';
 elsif new.revision<>old.revision and new.status='pending' then a:='integration.create';
 elsif old.credentials is null and new.credentials is not null then a:='integration.create';
 end if;
 if a is not null then insert into public.compliance_audit_events(business_id,action) values(case when tg_op='DELETE' then old.business_id else new.business_id end,a);end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
create trigger compliance_audit_integration after insert or update or delete on public.commerce_integrations for each row execute function public.audit_commerce_change();
create trigger compliance_audit_commerce_settings after insert or update on public.commerce_settings for each row execute function public.audit_commerce_change();
revoke all on function public.audit_commerce_change() from public,anon,authenticated;
grant execute on function public.audit_commerce_change() to service_role;
create function public.start_embedbot_trial(p_business_id uuid,p_actor uuid,p_terms_version text) returns timestamptz
language plpgsql security invoker set search_path='' as $$ declare result timestamptz; b public.businesses%rowtype; begin
 perform public.compliance_assert_owner(p_business_id,p_actor);
 select * into b from public.businesses where id=p_business_id for update;
 if not exists(select 1 from public.legal_acceptances where business_id=p_business_id and slug='terms' and version=p_terms_version) then raise exception 'terms_required'; end if;
 if b.current_period_end is not null or b.activated_at is not null or b.stripe_subscription_id is not null then
  if b.stripe_subscription_id is null and b.payment_status='unpaid' and b.subscription_status='trialing' and b.current_period_end>now() then return b.current_period_end; end if;
  raise exception 'trial_already_used';
 end if;
 result:=now()+interval '14 days';
 update public.businesses set activated=true,activated_at=now(),subscription_status='trialing',payment_status='unpaid',current_period_end=result,plan='starter',subscription_updated_at=now() where id=p_business_id;
 insert into public.compliance_audit_events(actor_user_id,business_id,action) values(p_actor,p_business_id,'trial.start');
 return result;
end $$;
revoke all on function public.start_embedbot_trial(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.start_embedbot_trial(uuid,uuid,text) to service_role;
commit;
