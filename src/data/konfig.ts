// Conexión con el proyecto Supabase de la app de recetas (el mismo que usa sverre-recepter/src/cloud.tsx).
// La clave publicable es pública por diseño: la protección la dan RLS y los roles de kitchen_members.
// Nunca poner aquí service_role, sb_secret ni la contraseña de la base de datos.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://eidphgaujpbgxuwjuiun.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_B4AlUVIFfzXjUNnGbCWEzA_hqjWNooS";

/** "lokal" = datos solo en este navegador (desarrollo y pruebas); por defecto, Supabase. */
export const DATALAGE: "supabase" | "lokal" = import.meta.env.VITE_DATA_MODE === "lokal" ? "lokal" : "supabase";
