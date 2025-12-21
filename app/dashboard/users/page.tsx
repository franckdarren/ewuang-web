// app/dashboard/users/page.tsx
'use client';

import React from 'react';
import { useUsersStore, type User } from '@/stores/usersStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Users, Store, Truck, Shield } from "lucide-react";
import { toast } from "sonner";
import { UsersTable } from "@/components/users/users-table";
import { UserFormModal } from "@/components/users/user-form-modal";
import { is } from 'zod/v4/locales';

// ============================================
// TYPES
// ============================================

interface UserFormValues {
    name: string;
    email: string;
    role: 'Client' | 'Boutique' | 'Livreur' | 'Administrateur';
    phone?: string | null;
    address?: string | null;
    description?: string | null;
    heure_ouverture?: string | null;
    heure_fermeture?: string | null;
    is_verified?: boolean;
    is_active?: boolean;
    url_logo?: string | null;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function UsersPage() {
    // ========== STORE ==========
    const {
        users,
        isLoading,
        stats,
        fetchUsers,
        deleteUser,
    } = useUsersStore();

    // ========== STATE LOCAL ==========
    const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<User | undefined>(undefined);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [userToDelete, setUserToDelete] = React.useState<User | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // ========== EFFECTS ==========

    /**
     * Charge les utilisateurs au montage du composant
     */
    React.useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // ========== HANDLERS ==========

    /**
     * Ouvre le modal de formulaire pour créer un utilisateur
     */
    const handleCreate = () => {
        setSelectedUser(undefined);
        setIsFormModalOpen(true);
    };

    /**
     * Ouvre le modal de formulaire pour modifier un utilisateur
     */
    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsFormModalOpen(true);
    };

    /**
     * Ferme le modal de formulaire
     */
    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setSelectedUser(undefined);
    };

    /**
     * Ouvre le dialog de confirmation de suppression
     */
    const handleDelete = (user: User) => {
        setUserToDelete(user);
        setIsDeleteDialogOpen(true);
    };

    /**
     * Confirme et exécute la suppression d'un utilisateur
     */
    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        const success = await deleteUser(userToDelete.id);

        if (success) {
            setIsDeleteDialogOpen(false);
            setUserToDelete(undefined);
        }
    };

    /**
     * Annule la suppression
     */
    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setUserToDelete(undefined);
    };

    /**
     * Active ou désactive un utilisateur
     */
    // const handleToggleActive = async (user: User) => {
    //     const newStatus = !user.is_active;
    //     await toggleUserActive(user.id, newStatus);
    // };

    /**
     * Vérifie ou dé-vérifie un utilisateur
     */
    // const handleToggleVerified = async (user: User) => {
    //     const newStatus = !user.is_verified;
    //     await toggleUserVerified(user.id, newStatus);
    // };

    /**
     * Gère la mise à jour du solde (placeholder pour l'instant)
     */
    // const handleUpdateSolde = (user: User) => {
    //     toast.info("Fonctionnalité à venir", {
    //         description: "La gestion du solde sera implémentée prochainement",
    //     });
    // };

    // ========== RENDER ==========

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* ========== EN-TÊTE ========== */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
                    <p className="text-muted-foreground">
                        Gérez les utilisateurs présents sur la plateforme
                    </p>
                </div>
                {/* <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un utilisateur
                </Button> */}
            </div>

            {/* ========== STATISTIQUES ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total des utilisateurs */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Total des utilisateurs
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.total}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {stats.active} actifs
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {stats.verified} vérifiés
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Boutiques */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            Boutiques
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.boutiques}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Vendeurs sur la plateforme
                        </p>
                    </CardContent>
                </Card>

                {/* Clients */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Clients
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.clients}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Acheteurs enregistrés
                        </p>
                    </CardContent>
                </Card>

                {/* Livreurs */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Livreurs
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.livreurs}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Partenaires de livraison
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ========== TABLEAU DES UTILISATEURS ========== */}
            <Card>
                <CardHeader>
                    <CardTitle>Liste des utilisateurs</CardTitle>
                    <CardDescription>
                        Consultez et gérez tous les utilisateurs de la plateforme
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable
                        users={users}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    // onToggleActive={handleToggleActive}
                    // onToggleVerified={handleToggleVerified}
                    // onUpdateSolde={handleUpdateSolde}
                    />
                </CardContent>
            </Card>

            {/* ========== MODAL DE FORMULAIRE ========== */}
            <UserFormModal
                open={isFormModalOpen}
                onClose={handleCloseFormModal}
                user={selectedUser}
                isLoading={isSubmitting}
            />

            {/* ========== DIALOG DE CONFIRMATION DE SUPPRESSION ========== */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. L'utilisateur{" "}
                            <span className="font-semibold">{userToDelete?.name}</span> sera
                            définitivement supprimé de la base de données.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDelete}>
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}