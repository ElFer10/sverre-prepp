-- Planner de mise en place: tablas propias en el proyecto Supabase de la app de recetas.
-- Ejecutar UNA sola vez, después de 001_independent_workspace.sql de la app de recetas.
-- Solo crea objetos planner_*. No modifica kitchen_workspace, kitchen_members ni save_kitchen.
--
-- Acceso (SPEC §7): un único catálogo y un único plan para toda la cocina.
--   Leer: cualquier miembro de kitchen_members (Chef, Kock, Service).
--   Escribir: solo Chef.
begin;

-- ¿Es el usuario actual miembro de la cocina / Chef? (security definer: no depende de la RLS de kitchen_members)
create function public.planner_ar_medlem() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.kitchen_members where user_id = (select auth.uid()));
$$;
create function public.planner_ar_chef() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.kitchen_members where user_id = (select auth.uid()) and role = 'Chef');
$$;
revoke all on function public.planner_ar_medlem(), public.planner_ar_chef() from public, anon;
grant execute on function public.planner_ar_medlem(), public.planner_ar_chef() to authenticated;

-- Quién y cuándo cambió cada fila (nunca lo decide el navegador)
create function public.planner_stampla() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- Catálogo: una fila por preparación. `data` es el objeto Forberedelse de la app (src/scheduler/types.ts).
-- receptId (dentro de data) apunta a una receta del JSON de kitchen_workspace: no puede haber clave foránea.
create table public.planner_forberedelser (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Plan de cada día: lista, cocineros, resultado del planificador, cierre y arrastre.
create table public.planner_dagar (
  datum date primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'datum' = datum::text),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Configuración (horario, recursos, horno, limpieza): una sola fila.
create table public.planner_installningar (
  id integer primary key check (id = 1),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

do $$
declare t text;
begin
  foreach t in array array['planner_forberedelser', 'planner_dagar', 'planner_installningar'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy medlem_laser on public.%I for select to authenticated using ((select public.planner_ar_medlem()))', t);
    execute format('create policy chef_skapar on public.%I for insert to authenticated with check ((select public.planner_ar_chef()))', t);
    execute format('create policy chef_andrar on public.%I for update to authenticated using ((select public.planner_ar_chef())) with check ((select public.planner_ar_chef()))', t);
    execute format('create policy chef_tar_bort on public.%I for delete to authenticated using ((select public.planner_ar_chef()))', t);
    execute format('create trigger stampla before insert or update on public.%I for each row execute function public.planner_stampla()', t);
  end loop;
end;
$$;

commit;
