// pages/api/commandes/create.ts
//
// ⚠️ ENDPOINT DÉPRÉCIÉ — NE PLUS UTILISER.
//
// Cet ancien flux créait une commande puis créditait IMMÉDIATEMENT les soldes
// des boutiques et de l'admin et décrémentait le stock, le tout SANS aucun
// paiement (statut "En attente"). C'était une faille d'intégrité financière :
// n'importe quel client authentifié pouvait créditer de l'argent à des
// boutiques sans jamais payer.
//
// Le checkout passe désormais exclusivement par le flux PVIT :
//   POST /api/paiements/initiate  → crée le groupe + sous-commandes (par boutique),
//                                    réserve le stock, initie le paiement.
//   webhook / polling de statut   → finalise (soldes, livraisons, notifications)
//                                    UNIQUEMENT après confirmation du paiement.
//
// On conserve la route comme pierre tombale pour renvoyer une erreur explicite
// aux anciens clients qui l'appelleraient encore, au lieu de la rétablir.

import type { NextApiRequest, NextApiResponse } from "next";

/**
 * @swagger
 * /api/commandes/create:
 *   post:
 *     deprecated: true
 *     summary: "[DÉPRÉCIÉ] Création directe de commande — remplacé par /api/paiements/initiate"
 *     description: >
 *       Endpoint désactivé. La création de commande passe désormais par le flux
 *       de paiement PVIT (/api/paiements/initiate). Les soldes ne sont crédités
 *       qu'après confirmation effective du paiement.
 *     tags:
 *       - Commandes
 *     responses:
 *       410:
 *         description: Endpoint déprécié — utiliser /api/paiements/initiate
 */

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error:
      "Cet endpoint est déprécié. La commande se crée désormais via le paiement : POST /api/paiements/initiate.",
    code: "ENDPOINT_DEPRECATED",
  });
}
