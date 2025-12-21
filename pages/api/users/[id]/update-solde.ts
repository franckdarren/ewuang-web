// pages/api/users/[id]/update-solde.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/{id}/update-solde:
 *   patch:
 *     summary: Met à jour le solde d'un utilisateur
 *     description: Crédite ou débite le compte d'un utilisateur
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - montant
 *               - action
 *             properties:
 *               montant:
 *                 type: number
 *                 description: Montant à créditer/débiter (en FCFA)
 *                 minimum: 0
 *               action:
 *                 type: string
 *                 enum: [credit, debit]
 *                 description: Type d'opération
 *     responses:
 *       200:
 *         description: Solde mis à jour avec succès
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Utilisateur introuvable
 *       500:
 *         description: Erreur serveur
 */

// ============================================
// CONFIGURATION SUPABASE
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// TYPES
// ============================================

interface ErrorResponse {
    error: string;
    details?: string;
}

interface SuccessResponse {
    user: any;
    message: string;
    ancien_solde: number;
    nouveau_solde: number;
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    // Vérification de la méthode HTTP
    if (req.method !== 'PATCH') {
        return res.status(405).json({
            error: 'Méthode non autorisée',
            details: `La méthode ${req.method} n'est pas supportée`,
        });
    }

    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    // Vérifier que l'utilisateur est admin
    if (profile.role !== "Administrateur") {
        return res.status(403).json({ error: "Accès interdit. Droits administrateur requis." });
    }

    const { id } = req.query;

    // Validation de l'ID
    if (!id || typeof id !== 'string') {
        return res.status(400).json({
            error: 'ID invalide',
            details: 'L\'ID de l\'utilisateur est requis',
        });
    }

    try {
        const { montant, action } = req.body;

        // Validation des données
        if (typeof montant !== 'number' || montant < 0) {
            return res.status(400).json({
                error: 'Montant invalide',
                details: 'Le montant doit être un nombre positif',
            });
        }

        if (action !== 'credit' && action !== 'debit') {
            return res.status(400).json({
                error: 'Action invalide',
                details: 'L\'action doit être "credit" ou "debit"',
            });
        }

        console.log(`💰 ${action === 'credit' ? 'Crédit' : 'Débit'} de ${montant} FCFA pour l'utilisateur ${id}`);

        // Récupération du solde actuel
        const { data: currentUser, error: fetchError } = await supabase
            .from('users')
            .select('solde, name')
            .eq('id', id)
            .single();

        if (fetchError || !currentUser) {
            return res.status(404).json({
                error: 'Utilisateur introuvable',
                details: `Aucun utilisateur avec l'ID ${id}`,
            });
        }

        const ancienSolde = currentUser.solde;

        // Calcul du nouveau solde
        let nouveauSolde: number;
        if (action === 'credit') {
            nouveauSolde = ancienSolde + montant;
        } else {
            nouveauSolde = ancienSolde - montant;

            // Vérification du solde négatif (optionnel selon vos règles métier)
            if (nouveauSolde < 0) {
                return res.status(400).json({
                    error: 'Solde insuffisant',
                    details: `Le solde actuel (${ancienSolde} FCFA) ne permet pas un débit de ${montant} FCFA`,
                });
            }
        }

        // Mise à jour du solde
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                solde: nouveauSolde,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Erreur Supabase:', updateError);
            return res.status(500).json({
                error: 'Erreur lors de la mise à jour du solde',
                details: updateError.message,
            });
        }

        console.log(`✅ Solde mis à jour: ${currentUser.name} - ${ancienSolde} FCFA → ${nouveauSolde} FCFA`);

        return res.status(200).json({
            user: updatedUser,
            message: `Solde ${action === 'credit' ? 'crédité' : 'débité'} avec succès`,
            ancien_solde: ancienSolde,
            nouveau_solde: nouveauSolde,
        });

    } catch (error) {
        console.error('❌ Erreur inattendue:', error);
        return res.status(500).json({
            error: 'Erreur serveur inattendue',
            details: error instanceof Error ? error.message : 'Erreur inconnue',
        });
    }
}