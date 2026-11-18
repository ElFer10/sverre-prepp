// Backend Supabase: tablas planner_* (lectura y escritura) y kitchen_workspace (solo lectura).
// Nunca escribe en las tablas de la app de recetas ni llama a save_kitchen.

import { createClient, type PostgrestError } from "@supabase/supabase-js";
import type { SparadDag } from "../dag/dagar";
import { sv } from "../i18n/sv";
import { lasGrundrecept } from "../katalog/koppling";
import { STANDARD_INSTALLNINGAR, type Forberedelse, type Installningar } from "../scheduler/types";
import { NatverksFel, VisbartFel, arNatverksMeddelande, type Anvandare, type Backend, type Roll } from "./backend";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./konfig";

/** Días que se cargan hacia atrás (los antiguos no hacen falta para planificar). */
const DAGAR_BAKAT = 60;

const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  // Sesión propia del planner: no interfiere con la de la app de recetas
  auth: { storageKey: "planner-auth", persistSession: true },
});

function kontrollera(error: PostgrestError | null) {
  if (!error) return;
  if (arNatverksMeddelande(error.message)) throw new NatverksFel(sv.fel.natverk);
  // 42P01 / PGRST205: la tabla no existe → falta ejecutar supabase/001_planner.sql
  if (error.code === "42P01" || (error.code === "PGRST205" && /planner_/.test(error.message)) || /planner_\w+.*(does not exist|schema cache)/i.test(error.message)) throw new VisbartFel(sv.fel.plannerSaknas);
  throw new VisbartFel(sv.fel.databas(error.message));
}

async function anvandareFor(userId: string, epost: string): Promise<Anvandare> {
  const { data, error } = await client.from("kitchen_members").select("role").eq("user_id", userId).maybeSingle();
  kontrollera(error);
  const roll = data?.role as Roll | undefined;
  if (!roll || !["Chef", "Kock", "Service"].includes(roll)) throw new VisbartFel(sv.fel.ingenRoll);
  return { epost, roll };
}

function datumBakat(dagar: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dagar);
  return d.toISOString().slice(0, 10);
}

export const supabaseBackend: Backend = {
  lage: "supabase",

  async aktuellAnvandare() {
    const { data, error } = await client.auth.getSession();
    // Token caducado y sin red: la sesión sigue guardada, no es "sin sesión"
    if (error && arNatverksMeddelande(error.message)) throw new NatverksFel(sv.fel.natverk);
    const user = data.session?.user;
    return user ? anvandareFor(user.id, user.email ?? "") : null;
  },

  async loggaIn(epost, losenord) {
    const { data, error } = await client.auth.signInWithPassword({ email: epost.trim(), password: losenord });
    if (error && arNatverksMeddelande(error.message)) throw new NatverksFel(sv.fel.natverk);
    if (error || !data.user) throw new VisbartFel(sv.fel.inloggning);
    return anvandareFor(data.user.id, data.user.email ?? epost);
  },

  async loggaUt() {
    await client.auth.signOut();
  },

  async hamta() {
    const [f, d, i] = await Promise.all([
      client.from("planner_forberedelser").select("data"),
      client.from("planner_dagar").select("data").gte("datum", datumBakat(DAGAR_BAKAT)),
      client.from("planner_installningar").select("data").eq("id", 1).maybeSingle(),
    ]);
    kontrollera(f.error);
    kontrollera(d.error);
    kontrollera(i.error);
    const katalog = (f.data ?? []).map((r) => r.data as Forberedelse).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
    const dagar = Object.fromEntries((d.data ?? []).map((r) => [(r.data as SparadDag).datum, r.data as SparadDag]));
    const installningar = { ...STANDARD_INSTALLNINGAR, ...((i.data?.data as Partial<Installningar>) ?? {}) };
    return { katalog, dagar, installningar };
  },

  async hamtaGrundrecept() {
    // Solo la parte de recetas del documento de la cocina
    const { data, error } = await client.from("kitchen_workspace").select("recipes:data->recipes").eq("id", 1).maybeSingle();
    kontrollera(error);
    const recetas = (data as { recipes?: unknown } | null)?.recipes;
    return (Array.isArray(recetas) ? recetas : []).flatMap((r) => lasGrundrecept(r) ?? []);
  },

  async sparaForberedelser(lista) {
    if (!lista.length) return;
    const { error } = await client.from("planner_forberedelser").upsert(lista.map((f) => ({ id: f.id, data: f })));
    kontrollera(error);
  },

  async taBortForberedelse(id) {
    const { error } = await client.from("planner_forberedelser").delete().eq("id", id);
    kontrollera(error);
  },

  async sparaDagar(lista) {
    if (!lista.length) return;
    const { error } = await client.from("planner_dagar").upsert(lista.map((d) => ({ datum: d.datum, data: d })));
    kontrollera(error);
  },

  async sparaInstallningar(i) {
    const { error } = await client.from("planner_installningar").upsert({ id: 1, data: i });
    kontrollera(error);
  },
};
