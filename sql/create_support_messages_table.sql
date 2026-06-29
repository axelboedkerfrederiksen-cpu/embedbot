create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'support',
  name text not null,
  email text not null,
  business_name text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint support_messages_type_check check (type in ('support', 'complaint')),
  constraint support_messages_status_check check (status in ('new', 'read', 'archived'))
);

create index if not exists support_messages_created_at_idx
  on public.support_messages (created_at desc);

create index if not exists support_messages_status_idx
  on public.support_messages (status);

alter table public.support_messages enable row level security;
