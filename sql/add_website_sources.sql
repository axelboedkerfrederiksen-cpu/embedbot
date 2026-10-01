-- Optional website/HTML knowledge source, isolated per chatbot.
create table public.website_sources (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  source_kind text not null check (source_kind in ('html', 'url')),
  source_name text not null check (char_length(source_name) between 1 and 2048),
  content_text text not null check (char_length(content_text) between 20 and 30000),
  character_count integer not null check (character_count between 20 and 30000),
  truncated boolean not null default false,
  imported_at timestamptz not null default now()
);
alter table public.website_sources enable row level security;
revoke all on public.website_sources from public, anon, authenticated;
grant all on public.website_sources to service_role;
