// app/dashboard/users/page.tsx
'use client';

import React from 'react';
import { useUsersStore, type User } from '@/stores/usersStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatFilterCard } from "@/components/stat-filter-card";
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
import { Skeleton } from "@/components/ui/skeleton";
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
        certifyShop,
    } = useUsersStore();

    // ========== STATE LOCAL ==========
    const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<User | undefined>(undefined);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [userToDelete, setUserToDelete] = React.useState<User | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);
    const [roleFilter, setRoleFilter] = React.useState<'all' | 'Boutique' | 'Client' | 'Livreur'>('all');

    // Toggle : re-cliquer sur la même carte → retour à "all".
    const toggleRoleFilter = (key: string) => {
        setRoleFilter((prev) => (prev === key ? 'all' : (key as typeof roleFilter)));
    };

    const filteredUsers = React.useMemo(() => {
        if (roleFilter === 'all') return users;
        return users.filter((u) => u.role === roleFilter);
    }, [users, roleFilter]);

    // ========== EFFECTS ==========

    /**
     * Charge les utilisateurs au montage du composant
     */
    React.useEffect(() => {
        fetchUsers().finally(() => setIsInitialLoading(false));
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
     * Certifie ou retire la certification d'une boutique
     */
    const handleToggleCertified = async (user: User) => {
        await certifyShop(user.id, !user.is_certified);
    };

    /**
     * Gère la mise à jour du solde (placeholder pour l'instant)
     */
    // const handleUpdateSolde = (user: User) => {
    //     toast.info("Fonctionnalité à venir", {
    //         description: "La gestion du solde sera implémentée prochainement",
    //     });
    // };

    // ========== RENDER ==========

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                {/* Skeleton en-tête */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-44" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-44" />
                </div>

                {/* Skeleton stats x4 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-9 w-16 mt-1" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-28" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Skeleton tableau */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-44" />
                        <Skeleton className="h-4 w-64 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* ========== EN-TÊTE ========== */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
                    <p className="text-muted-foreground">
                        Gérez les utilisateurs présents sur la plateforme
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un utilisateur
                </Button>
            </div>

            {/* ========== STATISTIQUES CLIQUABLES (filtres) ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total : sert de reset */}
                <StatFilterCard
                    filterKey="all"
                    activeFilter={roleFilter}
                    onSelect={(key) => setRoleFilter(key as typeof roleFilter)}
                    label={<><Users className="h-4 w-4" /> Total des utilisateurs</>}
                    value={stats.total}
                    footer={
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{stats.active} actifs</Badge>
                            <Badge variant="outline" className="text-xs">{stats.verified} vérifiés</Badge>
                        </div>
                    }
                />
                <StatFilterCard
                    filterKey="Boutique"
                    activeFilter={roleFilter}
                    onSelect={toggleRoleFilter}
                    label={<><Store className="h-4 w-4" /> Boutiques</>}
                    value={stats.boutiques}
                    activeRingClassName="ring-blue-500/40 border-blue-500/50 bg-blue-50/50"
                    footer={
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{stats.certified} certifiées</Badge>
                            <span>sur la plateforme</span>
                        </div>
                    }
                />
                <StatFilterCard
                    filterKey="Client"
                    activeFilter={roleFilter}
                    onSelect={toggleRoleFilter}
                    label={<><Users className="h-4 w-4" /> Clients</>}
                    value={stats.clients}
                    activeRingClassName="ring-emerald-500/40 border-emerald-500/50 bg-emerald-50/50"
                    footer={<p className="text-xs text-muted-foreground">Acheteurs enregistrés</p>}
                />
                <StatFilterCard
                    filterKey="Livreur"
                    activeFilter={roleFilter}
                    onSelect={toggleRoleFilter}
                    label={<><Truck className="h-4 w-4" /> Livreurs</>}
                    value={stats.livreurs}
                    activeRingClassName="ring-orange-500/40 border-orange-500/50 bg-orange-50/50"
                    footer={<p className="text-xs text-muted-foreground">Partenaires de livraison</p>}
                />
            </div>

            {/* ========== TABLEAU DES UTILISATEURS ========== */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>
                                {roleFilter === 'all'
                                    ? 'Liste des utilisateurs'
                                    : roleFilter === 'Boutique'
                                        ? 'Boutiques'
                                        : roleFilter === 'Client'
                                            ? 'Clients'
                                            : 'Livreurs'}
                            </CardTitle>
                            <CardDescription>
                                {roleFilter === 'all'
                                    ? 'Consultez et gérez tous les utilisateurs de la plateforme'
                                    : `${filteredUsers.length} utilisateur${filteredUsers.length > 1 ? 's' : ''} sur ${users.length}`}
                            </CardDescription>
                        </div>
                        {roleFilter !== 'all' && (
                            <Button variant="ghost" size="sm" onClick={() => setRoleFilter('all')}>
                                Réinitialiser le filtre
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <UsersTable
                        users={filteredUsers}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleCertified={handleToggleCertified}
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