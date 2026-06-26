// app/lib/sendPushFCM.ts
//
// Helper partagé d'envoi de notifications push FCM (app fermée / arrière-plan).
//
// Centralise la logique de push utilisée par tous les handlers :
//   - collecte des tokens d'un destinataire sur TOUS ses appareils :
//     table `device_tokens` (1..N par user) + repli legacy `users.fcm_token`,
//   - envoi par lots (limite FCM = 500 tokens / appel),
//   - best-effort : un échec push n'interrompt jamais le flux principal
//     (l'in-app est déjà persistée) ; Firebase non configuré → push ignoré,
//   - nettoyage automatique des tokens morts (désinstallation / expiration) :
//     les tokens rejetés par FCM sont supprimés de la base.
//
// Retourne le nombre de tokens effectivement ciblés.

import { getSupabaseAdmin } from "./supabaseSafeAdmin";
import { getMessagingSafe } from "./firebaseAdmin";

export interface PushNotif {
    type: string;            // libellé logique (ex. "Commande", "livraison"…)
    titre: string;
    message: string;
    lien?: string | null;
}

export interface PushOptions {
    // Channel Android (doit exister côté app). Défaut : "commandes".
    channelId?: string;
}

// Codes d'erreur FCM signalant un token définitivement invalide → à purger.
const TOKENS_MORTS = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
    "messaging/invalid-argument",
]);

// Découpe un tableau en lots de taille fixe.
function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = ReturnType<typeof getSupabaseAdmin>;

/**
 * Collecte les tokens FCM de plusieurs utilisateurs, sur tous leurs appareils.
 * Combine `device_tokens` (multi-device) et le repli `users.fcm_token`.
 * Tolérant : si la table `device_tokens` n'existe pas encore, on ne garde que
 * le repli legacy (aucune exception remontée).
 */
async function collecterTokens(supabaseAdmin: Admin, ids: string[]): Promise<string[]> {
    const tokens = new Set<string>();

    for (const batch of chunk(ids, 500)) {
        // 1. Multi-device (best-effort si la table n'existe pas).
        try {
            const { data, error } = await supabaseAdmin
                .from("device_tokens")
                .select("token")
                .in("user_id", batch);
            if (!error) {
                for (const row of data ?? []) {
                    if (row.token) tokens.add(row.token as string);
                }
            }
        } catch {
            // table absente / non migrée → on se contente du repli legacy
        }

        // 2. Repli legacy : users.fcm_token (un seul appareil).
        const { data: legacy } = await supabaseAdmin
            .from("users")
            .select("fcm_token")
            .in("id", batch)
            .not("fcm_token", "is", null);
        for (const row of legacy ?? []) {
            if (row.fcm_token) tokens.add(row.fcm_token as string);
        }
    }

    return [...tokens];
}

/**
 * Supprime de la base les tokens définitivement rejetés par FCM (appareils
 * désinstallés / tokens expirés), dans les deux sources. Best-effort.
 */
async function purgerTokensMorts(supabaseAdmin: Admin, tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    try {
        await supabaseAdmin.from("device_tokens").delete().in("token", tokens);
    } catch {
        // table absente → rien à purger côté device_tokens
    }
    // Repli legacy : on neutralise le token mort sur le user concerné.
    for (const batch of chunk(tokens, 100)) {
        await supabaseAdmin
            .from("users")
            .update({ fcm_token: null })
            .in("fcm_token", batch);
    }
}

/**
 * Envoie une push FCM à une liste d'user_ids (tous appareils). Best-effort :
 * ignore les destinataires sans token, ne lève jamais, purge les tokens morts.
 * Retourne le nombre de tokens ciblés.
 */
export async function envoyerPushFCM(
    userIds: string[],
    notif: PushNotif,
    options: PushOptions = {},
): Promise<number> {
    try {
        const ids = [...new Set(userIds.filter(Boolean))];
        if (ids.length === 0) return 0;

        const supabaseAdmin = getSupabaseAdmin();
        const tokens = await collecterTokens(supabaseAdmin, ids);
        if (tokens.length === 0) return 0;

        // Firebase non configuré → on ignore le push (l'in-app est déjà persistée).
        const messaging = getMessagingSafe();
        if (!messaging) return 0;

        const channelId = options.channelId ?? "commandes";
        const tokensMorts: string[] = [];

        for (const batch of chunk(tokens, 500)) {
            const resp = await messaging.sendEachForMulticast({
                tokens: batch,
                notification: { title: notif.titre, body: notif.message },
                data: {
                    // Le routage côté Flutter attend un type en minuscules
                    // (cohérent avec les autres push : "commande", "livraison"…).
                    type: notif.type.toLowerCase(),
                    route: notif.lien || "/",
                },
                android: {
                    priority: "high",
                    notification: { channelId, sound: "default", priority: "max" },
                },
                apns: { payload: { aps: { sound: "default", badge: 1 } } },
            });

            // Repère les tokens définitivement morts pour les purger ensuite.
            resp.responses.forEach((r, i) => {
                if (!r.success && r.error && TOKENS_MORTS.has(r.error.code)) {
                    tokensMorts.push(batch[i]);
                }
            });
        }

        await purgerTokensMorts(supabaseAdmin, tokensMorts);
        return tokens.length;
    } catch (err) {
        console.error("[sendPushFCM] échec push FCM:", err);
        return 0;
    }
}
