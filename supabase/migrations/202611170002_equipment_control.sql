-- Equipment control screens: catalog tables and calculated failure metrics.
create table if not exists public.equipment_sectors (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  availability_target numeric(7,6) not null default 0.999,
  repair_target_hours numeric(10,2) not null default 96,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_fault_types (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_registry (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  sector_id uuid not null references public.equipment_sectors(id) on delete restrict,
  category_id uuid not null references public.equipment_categories(id) on delete restrict,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, sector_id)
);

alter table public.equipment_failures
  add column if not exists equipment_id uuid references public.equipment_registry(id) on delete set null,
  add column if not exists fault_type_id uuid references public.equipment_fault_types(id) on delete set null;

create index if not exists equipment_failures_equipment_id_idx on public.equipment_failures(equipment_id);
create index if not exists equipment_failures_fault_type_id_idx on public.equipment_failures(fault_type_id);

create or replace function public.derive_equipment_failure_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  equipment_name text;
  sector_name text;
  category_name text;
  fault_name text;
  target_hours numeric;
begin
  if new.equipment_id is not null then
    select e.name, s.name, c.name, s.repair_target_hours
      into equipment_name, sector_name, category_name, target_hours
      from public.equipment_registry e
      join public.equipment_sectors s on s.id = e.sector_id
      join public.equipment_categories c on c.id = e.category_id
      where e.id = new.equipment_id;
    new.equipment := equipment_name;
    new.sector := sector_name;
    new.category := category_name;
    if target_hours is not null then
      new.repair_target := make_interval(secs => (target_hours * 3600)::double precision);
    end if;
  end if;
  if new.fault_type_id is not null then
    select name into fault_name from public.equipment_fault_types where id = new.fault_type_id;
    new.failure := fault_name;
  end if;

  if new.failed_at is not null then
    new.downtime := greatest(coalesce(new.returned_at, now()) - new.failed_at, interval '0');
    new.overdue_time := greatest(new.downtime - coalesce(new.repair_target, interval '0'), interval '0');
    if new.returned_at is null then
      new.status := case when new.overdue_time > interval '0' then 'Atrasado' else 'Em andamento' end;
    else
      new.status := case when new.overdue_time > interval '0' then 'Concluído com atraso' else 'Concluído' end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists derive_equipment_failure_metrics on public.equipment_failures;
create trigger derive_equipment_failure_metrics
before insert or update on public.equipment_failures
for each row execute function public.derive_equipment_failure_metrics();

do $$
declare t text;
begin
  foreach t in array array['equipment_sectors','equipment_categories','equipment_fault_types','equipment_registry'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read_staff', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.current_app_role() in (''admin'', ''supervisor''))', t || '_insert_managers', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.current_app_role() in (''admin'', ''supervisor'')) with check (public.current_app_role() in (''admin'', ''supervisor''))', t || '_update_managers', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.current_app_role() = ''admin'')', t || '_delete_admin', t);
    execute format('drop trigger if exists stamp_metadata on public.%I', t);
    execute format('create trigger stamp_metadata before insert or update on public.%I for each row execute function public.stamp_record_metadata()', t);
    execute format('drop trigger if exists audit_changes on public.%I', t);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t);
  end loop;
end;
$$;
