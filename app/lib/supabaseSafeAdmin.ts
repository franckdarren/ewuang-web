import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
    if (!supabaseAdminClient) {
        // Client mémoïsé : ne jamais y ouvrir de session utilisateur
        // (signInWithPassword / refreshSession / setSession) — voir supabaseAuthClient.ts.
        supabaseAdminClient = createClient(
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
    }
    return supabaseAdminClient;
}
