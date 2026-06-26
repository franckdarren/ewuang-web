// pages/api/remboursements/cron/escalader.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { envoyerPushFCM } from "../../../../app/lib/sendPushFCM";

/**
 * La fonction SQL `escalader_remboursements_sans_reponse` insère ses notifications
 * (rappels J-1 + escalades) directement en base — elle ne déclenche donc aucun
 * push FCM. On relaie ici, best-effort : on pousse les notifications liées aux
 * remboursements créées depuis `since` (juste avant l'appel RPC). Le filtre sur
 * le lien `/remboursements` évite de re-pousser des notifs d'autres flux (qui
 * gèrent déjà leur propre push).
 */
async function pousserNotifsEscalade(since: string): Promise<number> {
  try {
    const { data: notifs } = await supabaseAdmin
      .from("notifications")
      .select("user_id, type, titre, message, lien")
      .gte("created_at", since)
      .like("lien", "%remboursement%");

    if (!notifs || notifs.length === 0) return 0;

    let total = 0;
    for (const n of notifs) {
      if (!n.user_id) continue;
      total += await envoyerPushFCM([n.user_id as string], {
        type: (n.type as string) ?? "Commande",
        titre: n.titre as string,
        message: n.message as string,
        lien: n.lien as string | null,
      });
    }
    return total;
  } catch (err) {
    console.error("[cron escalader] push notifs:", err);
    return 0;
  }
}

/**
 * @swagger
 * /api/remboursements/cron/escalader:
 *   get:
 *     summary: Escalade les demandes de remboursement sans réponse vendeur
 *     description: >
 *       Appelé toutes les heures par pg_cron côté Supabase (via pg_net / HTTP,
 *       voir add_push_escalade_cron.sql) car Vercel Hobby ne permet pas de cron
 *       horaire. Exécute le RPC d'escalade (rappels J-1 + bascule en arbitrage)
 *       PUIS pousse en FCM les notifications fraîchement créées. Protégé par
 *       CRON_SECRET. Reste appelable manuellement (debug/monitoring).
 *     tags:
 *       - Remboursements
 *     responses:
 *       200:
 *         description: Nombre de demandes escaladées et de rappels envoyés
 *       401:
 *         description: Non autorisé
 */

function isAuthorizedCronCall(req: NextApiRequest): boolean {
  if (req.headers["x-vercel-cron"]) return true;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = req.headers.authorization ?? "";
  return auth === `Bearer ${cronSecret}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  if (!isAuthorizedCronCall(req)) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    // Capturé AVANT le RPC : borne basse des notifs créées par la fonction SQL.
    const since = new Date().toISOString();

    const { data, error } = await supabaseAdmin.rpc(
      "escalader_remboursements_sans_reponse",
    );

    if (error) {
      console.error("[cron escalader] rpc:", error);
      return res.status(500).json({ error: "Échec de l'escalade", details: error.message });
    }

    const row = Array.isArray(data) ? data[0] : data;

    // Relaie en push les notifs de remboursement que le SQL vient d'insérer.
    const pushCount = await pousserNotifsEscalade(since);

    return res.status(200).json({
      message: "Escalade exécutée",
      escaladees: row?.escaladees ?? 0,
      rappels: row?.rappels ?? 0,
      push_count: pushCount,
      note: "L'escalade tourne aussi automatiquement via pg_cron toutes les heures.",
    });
  } catch (err) {
    console.error("Error /api/remboursements/cron/escalader:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
