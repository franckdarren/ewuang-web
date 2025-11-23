import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,       // URL du projet
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!   // clé publique côté client
);
