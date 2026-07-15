import { getSupabaseAdmin } from "../lib/supabaseSafeAdmin";
import { generateSlugLocal } from "./slug";

/**
 * Génère un slug public unique pour une boutique à partir de son nom commercial.
 * En cas de collision avec un slug déjà persisté, ajoute un suffixe numérique
 * incrémental (`-2`, `-3`, ...) jusqu'à obtenir un slug libre.
 */
export async function generateUniqueBoutiqueSlug(name: string): Promise<string> {
    const supabaseAdmin = getSupabaseAdmin();
    const base = generateSlugLocal(name) || "boutique";

    let candidate = base;
    let suffix = 2;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("slug", candidate)
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) return candidate;

        candidate = `${base}-${suffix}`;
        suffix += 1;
    }
}
