-- Painel Operacional: estrutura inicial do Supabase/Postgres.
-- Execute no SQL Editor de um projeto Supabase novo. Nenhum dado de planilha é importado.

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'supervisor', 'operator', 'viewer');
create type public.entry_origin as enum ('manual', 'imported');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create table public.traffic_inspections (
  id uuid primary key default extensions.gen_random_uuid(),
  activity_type text,
  inspected_at date,
  month_label text,
  vehicle text,
  plate text,
  vehicle_class text,
  vehicle_type text,
  cnh_expires_on date,
  driver_name text,
  company text,
  manager_name text,
  interdicted text,
  violation_code text,
  violation text,
  classification text,
  status text,
  solution_date date,
  solution_month text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  entry_origin public.entry_origin not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.breathalyzer_tests (
  id uuid primary key default extensions.gen_random_uuid(),
  tested_at date,
  shift text,
  employee_registry text,
  company text,
  test_number text,
  alcohol_level numeric(10,4),
  result text,
  month_label text,
  worker_type text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  entry_origin public.entry_origin not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_mileage_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  recorded_on date,
  month_label text,
  initial_km numeric(12,2),
  final_km numeric(12,2),
  distance_km numeric(12,2),
  observation text,
  driver_name text,
  vehicle text,
  shift text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  entry_origin public.entry_origin not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fuel_records (
  id uuid primary key default extensions.gen_random_uuid(),
  recorded_on date,
  month_label text,
  vehicle text,
  station text,
  fuel_type text,
  price_per_unit numeric(12,4),
  total_paid numeric(14,2),
  quantity numeric(12,3),
  initial_km numeric(12,2),
  final_km numeric(12,2),
  distance_km numeric(12,2),
  average_consumption numeric(12,4),
  driver_name text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  entry_origin public.entry_origin not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.truck_weighings (
  id uuid primary key default extensions.gen_random_uuid(),
  weighed_at date,
  entry_time time,
  oci_odi text,
  check_date date,
  plate text,
  carrier text,
  location text,
  product text,
  tare_kg numeric(14,2),
  net_kg numeric(14,2),
  gross_kg numeric(14,2),
  invoice_number text,
  measured_weight_kg numeric(14,2),
  anomaly text,
  inspector_name text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  entry_origin public.entry_origin not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.metal_detector_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  recorded_at timestamptz,
  direction text,
  location text,
  quantity integer,
  screening_result text,
  guard_name text,
  occurrence text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  entry_origin public.entry_origin not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment_failures (
  id uuid primary key default extensions.gen_random_uuid(),
  equipment text,
  category text,
  failure text,
  failed_at timestamptz,
  returned_at timestamptz,
  downtime interval,
  repair_target interval,
  overdue_time interval,
  status text,
  observation text,
  sector text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  entry_origin public.entry_origin not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid references public.profiles(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

-- Identidade do autor é sempre derivada da sessão autenticada; valores enviados pelo browser são ignorados.
create or replace function public.stamp_record_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.created_by := (select auth.uid());
    new.updated_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id uuid;
begin
  if tg_op = 'DELETE' then
    row_id := old.id;
    insert into public.audit_log(table_name, record_id, action, actor_id, old_data)
    values (tg_table_name, row_id, tg_op, (select auth.uid()), to_jsonb(old));
    return old;
  elsif tg_op = 'UPDATE' then
    row_id := new.id;
    insert into public.audit_log(table_name, record_id, action, actor_id, old_data, new_data)
    values (tg_table_name, row_id, tg_op, (select auth.uid()), to_jsonb(old), to_jsonb(new));
    return new;
  else
    row_id := new.id;
    insert into public.audit_log(table_name, record_id, action, actor_id, new_data)
    values (tg_table_name, row_id, tg_op, (select auth.uid()), to_jsonb(new));
    return new;
  end if;
end;
$$;

-- Every operational table gets server-stamped authorship and an immutable audit trail.
do $$
declare t text;
begin
  foreach t in array array[
    'traffic_inspections', 'breathalyzer_tests', 'vehicle_mileage_logs',
    'fuel_records', 'truck_weighings', 'metal_detector_logs', 'equipment_failures'
  ] loop
    execute format('create trigger stamp_metadata before insert or update on public.%I for each row execute function public.stamp_record_metadata()', t);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t);
    execute format('create index %I on public.%I (created_at desc)', t || '_created_at_idx', t);
    execute format('create index %I on public.%I (created_by)', t || '_created_by_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read_authenticated', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.current_app_role() in (''admin'', ''supervisor'', ''operator''))', t || '_insert_staff', t);
    execute format('create policy %I on public.%I for update to authenticated using (created_by = (select auth.uid()) or public.current_app_role() in (''admin'', ''supervisor'')) with check (created_by = (select auth.uid()) or public.current_app_role() in (''admin'', ''supervisor''))', t || '_update_owner_or_supervisor', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.current_app_role() = ''admin'')', t || '_delete_admin', t);
  end loop;
end;
$$;

create or replace function public.stamp_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger stamp_profile_updated_at before update on public.profiles
for each row execute function public.stamp_profile_updated_at();

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_read_authenticated on public.profiles
  for select to authenticated using (true);
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Alteração de papel somente por admins. EXECUTE granted apenas a sessões autenticadas.
create or replace function public.set_user_role(target_user_id uuid, target_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'Apenas administradores podem alterar papéis.' using errcode = '42501';
  end if;
  update public.profiles set role = target_role where id = target_user_id;
  if not found then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

alter table public.audit_log enable row level security;
grant select on public.audit_log to authenticated;
revoke insert, update, delete on public.audit_log from anon, authenticated;
create policy audit_log_read_admin_supervisor on public.audit_log
  for select to authenticated using (public.current_app_role() in ('admin', 'supervisor'));

-- Índices usados pelos filtros mais comuns do painel.
create index traffic_inspections_date_idx on public.traffic_inspections (inspected_at desc);
create index breathalyzer_tests_date_idx on public.breathalyzer_tests (tested_at desc);
create index vehicle_mileage_logs_date_idx on public.vehicle_mileage_logs (recorded_on desc);
create index fuel_records_date_idx on public.fuel_records (recorded_on desc);
create index truck_weighings_date_idx on public.truck_weighings (weighed_at desc);
create index metal_detector_logs_date_idx on public.metal_detector_logs (recorded_at desc);
create index equipment_failures_status_idx on public.equipment_failures (status);
create index audit_log_record_idx on public.audit_log (table_name, record_id, changed_at desc);
