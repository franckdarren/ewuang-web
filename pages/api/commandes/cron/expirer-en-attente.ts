// pages/api/commandes/cron/expirer-en-attente.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/commandes/cron/expirer-en-attente:
 *   get:
 *     summary: [CRON] Expire les commandes en attente de validation client > 48h
 *     description: >
 *       Endpoint déclenché par Vercel Cron (voir vercel.json). Marque les commandes
 *       en "En attente de validation client" dont expire_at est dépassé comme
 *       "Expirée non validée" et libère le stock. Envoie aussi un rappel push pour
 *       les commandes qui expirent dans les 24h prochaines (rappel J-1).
 *
 *       Protégé par le header Vercel `x-vercel-cron` OU le secret CRON_SECRET.
 *     tags:
 *       - Commandes
 *     responses:
 *       200:
 *         description: Nombre de commandes expirées et de rappels envoyés
 *       401:
 *         description: Non autorisé
 */

function isAuthorizedCronCall(req: NextApiRequest): boolean {
  // Vercel Cron pose ce header en production
  if (req.headers["x-vercel-cron"]) return true;

  // Fallback : appel manuel avec un secret partagé
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
    // 1. Rappels J-1 : commandes qui expirent dans les 24h prochaines
    const dans24h = new Date(Date.now() + 24 * 3600 * 1000);
    const dans23h = new Date(Date.now() + 23 * 3600 * 1000);

    const { data: aRappeler } = await supabaseAdmin
      .from("commandes")
      .select("id, numero, user_id")
      .eq("statut", "En attente de validation client")
      .gte("expire_at", dans23h.toISOString())
      .lte("expire_at", dans24h.toISOString());

    let rappelsEnvoyes = 0;
    if (aRappeler && aRappeler.length > 0) {
      const notifs = aRappeler.map((c) => ({
        user_id: c.user_id,
        type: "commande" as const,
        titre: "Commande en attente",
        message: `La commande ${c.numero} expire dans moins de 24h. Validez-la pour la payer.`,
        lien: `/commandes/${c.id}/valider`,
        is_read: false,
        created_at: new Date().toISOString(),
      }));
      const { error } = await supabaseAdmin.from("notifications").insert(notifs);
      if (!error) rappelsEnvoyes = notifs.length;
    }

    // 2. Expirer les commandes dépassées + libérer le stock (via RPC)
    const { data: expirees, error: rpcError } = await supabaseAdmin.rpc(
      "expirer_commandes_en_attente_validation"
    );

    if (rpcError) {
      console.error("[cron expirer] rpc:", rpcError);
      return res.status(500).json({ error: "Échec de l'expiration" });
    }

    // 3. Notifier la boutique et le client pour chaque commande expirée
    const { data: expireesDetails } = await supabaseAdmin
      .from("commandes")
      .select("id, numero, user_id, creee_par_boutique_id")
      .eq("statut", "Expirée non validée")
      .gte("updated_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()); // dernières 5 minutes

    if (expireesDetails && expireesDetails.length > 0) {
      const notifs: any[] = [];
      for (const c of expireesDetails) {
        notifs.push({
          user_id: c.user_id,
          type: "commande",
          titre: "Commande expirée",
          message: `La commande ${c.numero} a expiré faute de validation.`,
          lien: `/commandes/${c.id}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
        if (c.creee_par_boutique_id) {
          notifs.push({
            user_id: c.creee_par_boutique_id,
            type: "commande",
            titre: "Commande client expirée",
            message: `La commande ${c.numero} a expiré, le stock a été restitué.`,
            lien: `/commandes/${c.id}`,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
      if (notifs.length > 0) await supabaseAdmin.from("notifications").insert(notifs);
    }

    return res.status(200).json({
      message: "Cron exécuté avec succès",
      expirees: expirees ?? 0,
      rappels_envoyes: rappelsEnvoyes,
    });
  } catch (err) {
    console.error("Error /api/commandes/cron/expirer-en-attente:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
