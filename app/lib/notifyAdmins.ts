import { getSupabaseAdmin } from "./supabaseSafeAdmin";
import { envoyerPushFCM } from "./sendPushFCM";

/**
 * Fan-out de notifications à tous les administrateurs actifs de la plateforme.
 *
 * Utilisé pour les alertes de modération (ex. tentative de partage de
 * coordonnées dans le chat). Diffuse la notif in-app (table `notifications`,
 * lue via Realtime) ET la push FCM, de façon best-effort : une erreur d'insert
 * ou de push ne casse jamais le flux appelant.
 */
export async function notifyAdmins(notif: {
    type: string;
    titre: string;
    message: string;
    lien?: string | null;
}): Promise<void> {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        const { data: admins } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("role", "Administrateur")
            .eq("is_active", true);

        const targets = (admins ?? [])
            .map((a) => a.id)
            .filter((id): id is string => !!id);

        if (targets.length === 0) return;

        const now = new Date().toISOString();
        await supabaseAdmin.from("notifications").insert(
            targets.map((uid) => ({
                user_id: uid,
                type: notif.type,
                titre: notif.titre,
                message: notif.message,
                lien: notif.lien ?? null,
                is_read: false,
                created_at: now,
            })),
        );

        await envoyerPushFCM(targets, notif);
    } catch (err) {
        console.error("[notifyAdmins] error:", err);
    }
}
