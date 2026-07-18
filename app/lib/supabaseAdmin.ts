import { createClient } from "@supabase/supabase-js";

// Singleton de module : ne jamais y ouvrir de session utilisateur
// (signInWithPassword / refreshSession / setSession). La session serait mémorisée
// et les requêtes PostgREST suivantes partiraient sous le rôle `authenticated`
// au lieu de `service_role`. Pour ces appels, utiliser createSupabaseAuthClient().
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

