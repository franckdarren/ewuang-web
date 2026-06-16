// pages/api/remboursements/cron/escalader.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/remboursements/cron/escalader:
 *   get:
 *     summary: [MANUAL] Escalade les demandes de remboursement sans réponse vendeur
 *     description: >
 *       En production, l'escalade tourne automatiquement via pg_cron côté Supabase
 *       (toutes les heures, voir sql/remboursements.sql). Cet endpoint reste
 *       disponible pour un déclenchement manuel (debug/monitoring) — protégé par
 *       CRON_SECRET. La fonction SQL gère rappels J-1 + notifications elle-même.
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
    const { data, error } = await supabaseAdmin.rpc(
      "escalader_remboursements_sans_reponse",
    );

    if (error) {
      console.error("[cron escalader] rpc:", error);
      return res.status(500).json({ error: "Échec de l'escalade", details: error.message });
    }

    const row = Array.isArray(data) ? data[0] : data;

    return res.status(200).json({
      message: "Escalade exécutée",
      escaladees: row?.escaladees ?? 0,
      rappels: row?.rappels ?? 0,
      note: "L'escalade tourne aussi automatiquement via pg_cron toutes les heures.",
    });
  } catch (err) {
    console.error("Error /api/remboursements/cron/escalader:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
