// components/articles/article-form-modal.tsx
'use client';

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { type Article } from '@/stores/articlesStore';

// ============================================
// PROPS
// ============================================

interface ArticleFormModalProps {
    open: boolean;
    onClose: () => void;
    article?: Article;
    isLoading?: boolean;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function ArticleFormModal({
    open,
    onClose,
    article,
    isLoading = false,
}: ArticleFormModalProps) {
    const isEditing = !!article;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Modifier l'article" : "Créer un article"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifiez les informations de l'article ci-dessous."
                            : "Remplissez le formulaire pour créer un nouvel article."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-8 text-center text-muted-foreground">
                    <p>Formulaire de création/modification d'article à implémenter</p>
                    <p className="text-sm mt-2">
                        Ce composant sera développé avec tous les champs nécessaires :
                    </p>
                    <ul className="text-xs mt-4 space-y-1 text-left max-w-md mx-auto">
                        <li>• Nom de l'article</li>
                        <li>• Description</li>
                        <li>• Prix et prix promotionnel</li>
                        <li>• Catégorie</li>
                        <li>• Upload d'images</li>
                        <li>• Gestion des variations (couleur, taille, stock)</li>
                        <li>• Options Made in Gabon, Promotion, etc.</li>
                    </ul>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Annuler
                    </Button>
                    <Button disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Mettre à jour" : "Créer"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}