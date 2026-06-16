// pages/api/commandes/cron/expirer-en-attente.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/commandes/cron/expirer-en-attente:
 *   get:
 *     summary: [MANUAL] Déclenche manuellement l'expiration des commandes en attente
 *     description: >
 *       En production, l'expiration tourne automatiquement via pg_cron côté Supabase
 *       (toutes les heures, voir sql/commande_boutique_pour_client.sql). Cet endpoint
 *       reste disponible pour un déclenchement manuel (debug, monitoring) — protégé
 *       par CRON_SECRET. La fonction SQL gère rappels J-1 + notifications elle-même.
 *     tags:
 *       - Commandes
 *     responses:
 *       200:
 *         description: Nombre de commandes expirées et de rappels envoyés
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
      "expirer_commandes_en_attente_validation"
    );

    if (error) {
      console.error("[cron expirer] rpc:", error);
      return res.status(500).json({ error: "Échec de l'expiration", details: error.message });
    }

    // La RPC retourne TABLE(expirees, rappels) — Supabase JS la renvoie sous forme [{...}]
    const row = Array.isArray(data) ? data[0] : data;

    return res.status(200).json({
      message: "Expiration exécutée",
      expirees: row?.expirees ?? 0,
      rappels: row?.rappels ?? 0,
      note: "L'expiration tourne aussi automatiquement via pg_cron toutes les heures.",
    });
  } catch (err) {
    console.error("Error /api/commandes/cron/expirer-en-attente:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
