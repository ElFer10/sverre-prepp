// Prueba supabase/001_planner.sql en un Postgres embebido (PGlite) antes de ejecutarlo en producción.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CHEF = "00000000-0000-4000-8000-000000000001";
const KOCK = "00000000-0000-4000-8000-000000000002";
const SERVICE = "00000000-0000-4000-8000-000000000003";
const UTOMSTAENDE = "00000000-0000-4000-8000-000000000004"; // sesión sin rol en la cocina

let db: PGlite;

/** Actúa como un usuario autenticado de Supabase (o como anónimo). */
async function som(user: string | "anon") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user === "anon" ? "" : user]);
  await db.exec(user === "anon" ? "set role anon" : "set role authenticated");
}

const forb = (id: string, namn = id) => JSON.stringify({ id, namn, faser: [], beroendeAv: [], farskhet: "normal", kanAvslutasEfterOppning: false, aktiv: true });

async function objekt(): Promise<string[]> {
  await db.exec("reset role");
  const r = await db.query<{ n: string }>(
    "select c.relname as n from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r' union all select p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' order by 1",
  );
  return r.rows.map((x) => x.n);
}

beforeAll(async () => {
  db = new PGlite();
  // Lo mínimo de Supabase y de la app de recetas (copia de sverre-recepter/supabase/001_independent_workspace.sql)
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth to authenticated, anon;
    create table public.kitchen_members (user_id uuid primary key references auth.users(id) on delete cascade, role text not null check (role in ('Chef','Kock','Service')));
    create table public.kitchen_workspace (id integer primary key check (id = 1), revision bigint not null default 0, data jsonb not null);
    insert into public.kitchen_workspace(id, data) values (1, '{"recipes":[]}');
    alter table public.kitchen_members enable row level security;
    alter table public.kitchen_workspace enable row level security;
    revoke all on public.kitchen_members, public.kitchen_workspace from anon, authenticated;
    grant select on public.kitchen_members, public.kitchen_workspace to authenticated;
    create policy read_own_membership on public.kitchen_members for select to authenticated using (user_id = (select auth.uid()));
    create policy read_kitchen on public.kitchen_workspace for select to authenticated using (exists(select 1 from public.kitchen_members where user_id = (select auth.uid())));
  `);
  for (const id of [CHEF, KOCK, SERVICE, UTOMSTAENDE]) await db.query("insert into auth.users values ($1)", [id]);
  for (const [id, roll] of [
    [CHEF, "Chef"],
    [KOCK, "Kock"],
    [SERVICE, "Service"],
  ])
    await db.query("insert into kitchen_members values ($1, $2)", [id, roll]);
});

afterAll(async () => {
  await db?.close();
});

describe("supabase/001_planner.sql", () => {
  it("solo añade objetos planner_* y no toca la app de recetas", async () => {
    const antes = await objekt();
    const workspaceAntes = (await db.query("select * from kitchen_workspace")).rows;
    await db.exec(await readFile(new URL("../../supabase/001_planner.sql", import.meta.url), "utf8"));
    const despues = await objekt();
    const nuevos = despues.filter((n) => !antes.includes(n));
    expect(nuevos.every((n) => n.startsWith("planner_"))).toBe(true);
    expect(nuevos.sort()).toEqual([
      "planner_ar_chef",
      "planner_ar_medlem",
      "planner_dagar",
      "planner_forberedelser",
      "planner_installningar",
      "planner_stampla",
    ]);
    await db.exec("reset role");
    expect((await db.query("select * from kitchen_workspace")).rows).toEqual(workspaceAntes);
  });

  it("Chef crea, modifica y borra; queda registrado quién lo hizo", async () => {
    await som(CHEF);
    await db.query("insert into planner_forberedelser(id, data, updated_by) values ('mandlar', $1, $2)", [forb("mandlar"), KOCK]);
    await db.query("insert into planner_dagar(datum, data) values ('2026-11-18', $1)", [JSON.stringify({ datum: "2026-11-18", kockar: 2, poster: [], stangd: false })]);
    await db.query("insert into planner_installningar(id, data) values (1, '{\"start\":\"14:00\"}')");
    await db.query("update planner_forberedelser set data = $1 where id = 'mandlar'", [forb("mandlar", "Mandlar")]);
    const r = await db.query<{ updated_by: string; namn: string }>("select updated_by, data->>'namn' as namn from planner_forberedelser where id = 'mandlar'");
    // updated_by lo pone el servidor, aunque el cliente intente otro valor
    expect(r.rows).toEqual([{ updated_by: CHEF, namn: "Mandlar" }]);
    await db.query("insert into planner_forberedelser(id, data) values ('tmp', $1)", [forb("tmp")]);
    await db.query("delete from planner_forberedelser where id = 'tmp'");
    expect((await db.query("select id from planner_forberedelser order by id")).rows).toEqual([{ id: "mandlar" }]);
  });

  it("Kock y Service leen todo pero no pueden escribir", async () => {
    for (const user of [KOCK, SERVICE]) {
      await som(user);
      expect((await db.query("select id from planner_forberedelser")).rows).toHaveLength(1);
      expect((await db.query("select datum from planner_dagar")).rows).toHaveLength(1);
      expect((await db.query("select id from planner_installningar")).rows).toHaveLength(1);
      await expect(db.query("insert into planner_forberedelser(id, data) values ('x', $1)", [forb("x")])).rejects.toThrow(/row-level security/);
      // update y delete no fallan, pero no afectan a ninguna fila
      expect((await db.query("update planner_forberedelser set data = $1 where id = 'mandlar'", [forb("mandlar", "Hackat")])).affectedRows).toBe(0);
      expect((await db.query("delete from planner_dagar")).affectedRows).toBe(0);
    }
    await som(CHEF);
    expect((await db.query<{ n: string }>("select data->>'namn' as n from planner_forberedelser")).rows).toEqual([{ n: "Mandlar" }]);
    expect((await db.query("select datum from planner_dagar")).rows).toHaveLength(1);
  });

  it("una cuenta sin rol en la cocina no ve nada; sin sesión, ni siquiera puede consultar", async () => {
    await som(UTOMSTAENDE);
    expect((await db.query("select * from planner_forberedelser")).rows).toEqual([]);
    expect((await db.query("select * from planner_dagar")).rows).toEqual([]);
    await expect(db.query("insert into planner_dagar(datum, data) values ('2026-11-19', $1)", [JSON.stringify({ datum: "2026-11-19" })])).rejects.toThrow();
    await som("anon");
    await expect(db.query("select * from planner_forberedelser")).rejects.toThrow(/permission denied/);
  });

  it("rechaza datos incoherentes", async () => {
    await som(CHEF);
    await expect(db.query("insert into planner_forberedelser(id, data) values ('a', $1)", [forb("b")])).rejects.toThrow(/check/);
    await expect(db.query("insert into planner_forberedelser(id, data) values ('Mal Id', $1)", [forb("Mal Id")])).rejects.toThrow(/check/);
    await expect(db.query("insert into planner_dagar(datum, data) values ('2026-11-20', $1)", [JSON.stringify({ datum: "2026-11-21" })])).rejects.toThrow(/check/);
    await expect(db.query("insert into planner_installningar(id, data) values (2, '{}')")).rejects.toThrow(/check/);
  });
});
