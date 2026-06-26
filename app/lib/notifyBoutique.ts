import { getSupabaseAdmin } from "./supabaseSafeAdmin";
import { envoyerPushFCM } from "./sendPushFCM";

/**
 * Fan-out de notifications aux membres actifs d'une boutique.
 *
 * Phase 2 : une boutique = 1 proprio + N gérants. Le `vendeur_id` historique
 * d'une commande ou le `participant_*_id` d'un thread chat pointent vers le
 * compte « principal » (= proprio.id). Pour que les gérants reçoivent les
 * notifications de leur boutique, on les diffuse à tous les `user_id` actifs
 * de `boutique_membres` ayant le même `boutique_id`.
 *
 * Pour préserver la rétrocompatibilité quand la boutique n'a pas encore de
 * ligne `boutique_membres` (cas legacy avant backfill), on retombe sur
 * `[boutiqueId]` — la notif arrive au moins au proprio.
 *
 * Diffuse à la fois la notif in-app (table `notifications`, lue via Realtime)
 * ET la push FCM (app fermée / arrière-plan), de façon best-effort : une erreur
 * d'insert ou de push ne casse pas le flux principal. Les notifications sont une
 * commodité, pas une garantie transactionnelle.
 */
export async function notifyBoutiqueMembres(
    boutiqueId: string,
    notif: {
        type: string;
        titre: string;
        message: string;
        lien?: string | null;
    },
): Promise<void> {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        // Récupère les user_id actifs de cette boutique (proprio inclus).
        const { data: membres } = await supabaseAdmin
            .from("boutique_membres")
            .select("user_id")
            .eq("boutique_id", boutiqueId)
            .eq("statut", "active");

        const userIds = (membres ?? [])
            .map(m => m.user_id)
            .filter((id): id is string => !!id);

        // Fallback legacy : si aucune ligne, on notifie au moins le proprio.
        const targets = userIds.length > 0 ? userIds : [boutiqueId];

        const now = new Date().toISOString();
        await supabaseAdmin.from("notifications").insert(
            targets.map(uid => ({
                user_id: uid,
                type: notif.type,
                titre: notif.titre,
                message: notif.message,
                lien: notif.lien ?? null,
                is_read: false,
                created_at: now,
            })),
        );

        // Push FCM (app fermée / arrière-plan) aux mêmes destinataires.
        await envoyerPushFCM(targets, notif);
    } catch (err) {
        console.error("[notifyBoutiqueMembres] error:", err);
    }
}
