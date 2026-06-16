-- Widget style controls for outline + opacity customization.
-- Idempotent: can be executed multiple times safely.

alter table public.businesses
add column if not exists chat_outline_enabled text default 'false',
add column if not exists chat_outline_color text default '#111111',
add column if not exists chat_outline_width text default '1',
add column if not exists chat_outline_opacity text default '25',
add column if not exists widget_opacity text default '100';
