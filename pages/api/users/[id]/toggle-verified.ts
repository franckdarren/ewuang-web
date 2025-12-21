// pages/api/users/[id]/toggle-verified.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/{id}/toggle-verified:
 *   patch:
 *     summary: Vérifie ou dé-vérifie un utilisateur
 *     description: Change le statut de vérification d'un utilisateur
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
 *               - is_verified
 *             properties:
 *               is_verified:
 *                 type: boolean
 *                 description: Nouveau statut de vérification
 *     responses:
 *       200:
 *         description: Statut de vérification mis à jour avec succès
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
        const { is_verified } = req.body;

        // Validation des données
        if (typeof is_verified !== 'boolean') {
            return res.status(400).json({
                error: 'Données invalides',
                details: 'Le champ is_verified doit être un booléen',
            });
        }

        console.log(`🔄 Changement du statut de vérification de l'utilisateur ${id} à ${is_verified}`);

        // Mise à jour du statut de vérification
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
                is_verified,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Erreur Supabase:', error);
            return res.status(500).json({
                error: 'Erreur lors de la mise à jour du statut de vérification',
                details: error.message,
            });
        }

        if (!updatedUser) {
            return res.status(404).json({
                error: 'Utilisateur introuvable',
                details: `Aucun utilisateur avec l'ID ${id}`,
            });
        }

        console.log(`✅ Statut de vérification mis à jour: ${updatedUser.name} -> ${is_verified}`);

        return res.status(200).json({
            user: updatedUser,
            message: `Utilisateur ${is_verified ? 'vérifié' : 'dé-vérifié'} avec succès`,
        });

    } catch (error) {
        console.error('❌ Erreur inattendue:', error);
        return res.status(500).json({
            error: 'Erreur serveur inattendue',
            details: error instanceof Error ? error.message : 'Erreur inconnue',
        });
    }
}