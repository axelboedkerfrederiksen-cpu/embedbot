begin;

-- Apply agreed defaults only to future rows, preserving existing instructions.
-- Do not change existing retention values or invoke destructive cleanup here.
alter table public.businesses alter column retention_days set default 30;
alter table public.business_privacy_settings alter column ticket_retention_days set default 90;

commit;
