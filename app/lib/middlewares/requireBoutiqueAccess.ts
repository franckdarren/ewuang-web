import { NextApiRequest, NextApiResponse } from "next";
import { requireUserAuth } from "./requireUserAuth";
import { getSupabaseAdmin } from "../supabaseSafeAdmin";

/**
 * Résout le `boutique_id` d'un user de rôle Boutique sans bloquer en cas
 * d'absence. Utilisé par les endpoints partagés Boutique/Admin (variations,
 * stocks, etc.) qui veulent appliquer la résolution multi-membres pour les
 * comptes Boutique tout en laissant passer un Admin.
 *
 *  - Pour un proprio : retourne son propre id (fallback legacy si pas de ligne membres).
 *  - Pour un gérant actif : retourne le boutique_id de son membership.
 *  - Pour tout autre rôle : retourne null (l'appelant n'a pas de boutique).
 */
export async function resolveBoutiqueIdFor(userId: string, role: string): Promise<string | null> {
    if (role !== "Boutique") return null;
    const supabaseAdmin = getSupabaseAdmin();
    const { data: membership } = await supabaseAdmin
        .from("boutique_membres")
        .select("boutique_id")
        .eq("user_id", userId)
        .eq("statut", "active")
        .maybeSingle();
    return membership?.boutique_id ?? userId; // fallback legacy : propre id
}

/**
 * Résolution d'accès Boutique (Phase 2 — multi-profil).
 *
 * Vérifie que l'appelant est authentifié, qu'il a un rôle Boutique, et résout
 * l'ID de la boutique sur laquelle il opère :
 *  - s'il est proprio → boutique_id = son propre users.id
 *  - s'il est gérant → boutique_id = users.id du compte « principal »
 *
 * `roleMembre` permet aux handlers d'appliquer des gardes fines (ex: seul un
 * proprio peut inviter/révoquer ou modifier le profil commercial).
 *
 * Le retour `boutiqueId` doit être utilisé par les handlers articles/commandes/
 * codes_promo/etc. à la place de `auth.profile.id` : c'est ce qui garantit que
 * gérant et proprio voient et modifient bien les mêmes ressources.
 *
 * Fallback legacy : pour une Boutique sans ligne `boutique_membres` (cas qui
 * ne devrait pas survenir après le backfill, mais on défend en profondeur),
 * on traite l'appelant comme proprio sur sa propre boutique.
 */
export interface BoutiqueAccess {
    auth: NonNullable<Awaited<ReturnType<typeof requireUserAuth>>>;
    boutiqueId: string;
    roleMembre: "proprio" | "gerant";
    isProprio: boolean;
    membreId: string | null; // id de la ligne boutique_membres ; null si fallback legacy
}

export async function requireBoutiqueAccess(
    req: NextApiRequest,
    res: NextApiResponse,
): Promise<BoutiqueAccess | null> {
    const auth = await requireUserAuth(req, res);
    if (!auth) return null;

    if (auth.profile.role !== "Boutique") {
        res.status(403).json({ error: "Accès interdit : rôle Boutique requis" });
        return null;
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: membership } = await supabaseAdmin
        .from("boutique_membres")
        .select("id, boutique_id, role_membre, statut")
        .eq("user_id", auth.profile.id)
        .eq("statut", "active")
        .maybeSingle();

    if (membership) {
        return {
            auth,
            boutiqueId: membership.boutique_id,
            roleMembre: membership.role_membre,
            isProprio: membership.role_membre === "proprio",
            membreId: membership.id,
        };
    }

    // Fallback legacy : Boutique sans ligne dans boutique_membres.
    return {
        auth,
        boutiqueId: auth.profile.id,
        roleMembre: "proprio",
        isProprio: true,
        membreId: null,
    };
}
