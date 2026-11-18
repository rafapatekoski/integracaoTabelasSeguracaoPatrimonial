-- Controle de veículos. Aplicar após a migração inicial.
create table if not exists public.vehicle_catalog (
 id uuid primary key default extensions.gen_random_uuid(), kind text not null check (kind in ('vehicle','driver','station','fuel','purpose')), name text not null, plate text, role_description text,
 created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create unique index if not exists vehicle_catalog_plate_unique on public.vehicle_catalog (upper(trim(plate))) where kind='vehicle' and plate is not null;
create unique index if not exists vehicle_catalog_named_unique on public.vehicle_catalog (kind, lower(trim(name))) where kind <> 'vehicle';
create table if not exists public.vehicle_trips (
 id uuid primary key default extensions.gen_random_uuid(), trip_date date not null, vehicle_id uuid not null references public.vehicle_catalog(id), driver_id uuid not null references public.vehicle_catalog(id), start_km numeric(12,2) not null check(start_km>=0), end_km numeric(12,2) not null check(end_km>=start_km), purpose text, observation text,
 created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.vehicle_fuel_entries (
 id uuid primary key default extensions.gen_random_uuid(), filled_at timestamptz not null, vehicle_id uuid not null references public.vehicle_catalog(id), driver_id uuid not null references public.vehicle_catalog(id), station_id uuid not null references public.vehicle_catalog(id), fuel_id uuid not null references public.vehicle_catalog(id), odometer numeric(12,2) not null check(odometer>=0), liters numeric(12,3) not null check(liters>0), total numeric(14,2) not null check(total>=0),
 created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
do $$ declare t text; begin
 foreach t in array array['vehicle_catalog','vehicle_trips','vehicle_fuel_entries'] loop
 execute format('alter table public.%I enable row level security', t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('drop policy if exists vehicle_read on public.%I',t);
 execute format('create policy vehicle_read on public.%I for select to authenticated using (true)',t);
 execute format('drop policy if exists vehicle_insert on public.%I',t);
 if t='vehicle_catalog' then
 execute format('create policy vehicle_insert on public.%I for insert to authenticated with check (public.current_app_role() in (''admin'',''supervisor''))',t);
 else
 execute format('create policy vehicle_insert on public.%I for insert to authenticated with check (public.current_app_role() in (''admin'',''supervisor'',''operator''))',t);
 end if;
 execute format('drop policy if exists vehicle_update on public.%I',t);
 execute format('create policy vehicle_update on public.%I for update to authenticated using (public.current_app_role() in (''admin'',''supervisor'')) with check (public.current_app_role() in (''admin'',''supervisor''))',t);
 execute format('drop policy if exists vehicle_delete on public.%I',t);
 execute format('create policy vehicle_delete on public.%I for delete to authenticated using (public.current_app_role() = ''admin'')',t);
 execute format('drop trigger if exists stamp_metadata on public.%I',t);
 execute format('create trigger stamp_metadata before insert or update on public.%I for each row execute function public.stamp_record_metadata()',t);
 execute format('drop trigger if exists audit_changes on public.%I',t);
 execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()',t);
 end loop;
end $$;
