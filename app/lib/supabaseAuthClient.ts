import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase éphémère (clé anon) dédié aux appels d'auth côté serveur qui
 * ouvrent une session : signInWithPassword, refreshSession, etc.
 *
 * ⚠️ Ne JAMAIS utiliser `supabaseAdmin` pour ces appels : le client admin est un
 * singleton de module, la session créée y resterait stockée et toutes les requêtes
 * PostgREST suivantes partiraient avec le JWT `authenticated` de cet utilisateur
 * au lieu de la clé service_role (→ erreur 42501 "permission denied for schema public").
 *
 * Chaque appel crée une instance jetable, sans persistance ni auto-refresh.
 */
export function createSupabaseAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
