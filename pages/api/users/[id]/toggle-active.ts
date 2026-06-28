// pages/api/users/[id]/toggle-active.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";

/**
 * @swagger
 * /api/users/{id}/toggle-active:
 *   patch:
 *     summary: Active ou désactive un utilisateur
 *     description: Change le statut actif d'un utilisateur
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
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: Nouveau statut actif
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
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

    const auth = await requirePermission(req, res, "users.write");
    if (!auth) return;

    const { id } = req.query;

    // Validation de l'ID
    if (!id || typeof id !== 'string') {
        return res.status(400).json({
            error: 'ID invalide',
            details: 'L\'ID de l\'utilisateur est requis',
        });
    }

    try {
        const { is_active } = req.body;

        // Validation des données
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                error: 'Données invalides',
                details: 'Le champ is_active doit être un booléen',
            });
        }

        console.log(`🔄 Changement du statut actif de l'utilisateur ${id} à ${is_active}`);

        // Mise à jour du statut
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
                is_active,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Erreur Supabase:', error);
            return res.status(500).json({
                error: 'Erreur lors de la mise à jour du statut',
                details: error.message,
            });
        }

        if (!updatedUser) {
            return res.status(404).json({
                error: 'Utilisateur introuvable',
                details: `Aucun utilisateur avec l'ID ${id}`,
            });
        }

        console.log(`✅ Statut actif mis à jour: ${updatedUser.name} -> ${is_active}`);

        return res.status(200).json({
            user: updatedUser,
            message: `Utilisateur ${is_active ? 'activé' : 'désactivé'} avec succès`,
        });

    } catch (error) {
        console.error('❌ Erreur inattendue:', error);
        return res.status(500).json({
            error: 'Erreur serveur inattendue',
            details: error instanceof Error ? error.message : 'Erreur inconnue',
        });
    }
}