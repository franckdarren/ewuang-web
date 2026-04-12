// app/dashboard/transactions/page.tsx
'use client';

import React from 'react';
import { useTransactionsStore, type Transaction, type PaiementStatut } from '@/stores/transactionsStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    TrendingUp,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCcw,
    CreditCard,
    Smartphone,
    Banknote,
    Copy,
    User,
    Calendar,
    Hash,
} from "lucide-react";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// ============================================
// HELPERS
// ============================================

const formatMontant = (montant: number) =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
    }).format(montant);

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const getStatutConfig = (statut: PaiementStatut) => {
    switch (statut) {
        case 'valide':
            return { label: 'Validé', variant: 'default' as const, icon: CheckCircle2, className: 'bg-green-600' };
        case 'en_attente':
            return { label: 'En attente', variant: 'secondary' as const, icon: Clock, className: '' };
        case 'echoue':
            return { label: 'Échoué', variant: 'destructive' as const, icon: XCircle, className: '' };
        case 'rembourse':
            return { label: 'Remboursé', variant: 'outline' as const, icon: RefreshCcw, className: 'text-orange-600 border-orange-600' };
    }
};

const getMethodeConfig = (methode: string) => {
    switch (methode) {
        case 'carte': return { label: 'Carte bancaire', icon: CreditCard };
        case 'mobile_money': return { label: 'Mobile Money', icon: Smartphone };
        case 'especes': return { label: 'Espèces', icon: Banknote };
        default: return { label: methode, icon: CreditCard };
    }
};

const getUserInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ============================================
// MODAL DE DÉTAILS
// ============================================

interface TransactionViewModalProps {
    open: boolean;
    onClose: () => void;
    transaction: Transaction | undefined;
}

function TransactionViewModal({ open, onClose, transaction }: TransactionViewModalProps) {
    if (!transaction) return null;

    const statut = getStatutConfig(transaction.statut);
    const methode = getMethodeConfig(transaction.methode);
    const StatutIcon = statut.icon;
    const MethodeIcon = methode.icon;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Détails de la transaction</DialogTitle>
                    <DialogDescription>
                        Informations complètes sur cette transaction
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Montant + statut */}
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Montant</p>
                            <p className={`text-2xl font-bold ${transaction.statut === 'valide' ? 'text-green-600' : ''}`}>
                                {formatMontant(transaction.montant)}
                            </p>
                        </div>
                        <Badge variant={statut.variant} className={statut.className}>
                            <StatutIcon className="mr-1 h-3 w-3" />
                            {statut.label}
                        </Badge>
                    </div>

                    <Separator />

                    {/* Références */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Références
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Référence</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">{transaction.reference}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => navigator.clipboard.writeText(transaction.reference)}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {transaction.transaction_id && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">ID Transaction</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm truncate max-w-[180px]">
                                            {transaction.transaction_id}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => navigator.clipboard.writeText(transaction.transaction_id!)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Paiement */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Paiement
                        </h3>
                        <div className="flex items-center gap-2 text-sm">
                            <MethodeIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{methode.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{formatDate(transaction.created_at)}</span>
                        </div>
                    </div>

                    {/* Client */}
                    {transaction.users && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Client
                                </h3>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="bg-primary/10">
                                            {getUserInitials(transaction.users.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{transaction.users.name}</p>
                                        <p className="text-xs text-muted-foreground">{transaction.users.email}</p>
                                        {transaction.users.phone && (
                                            <p className="text-xs text-muted-foreground">{transaction.users.phone}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Commandes liées */}
                    {transaction.commandes?.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Commandes liées ({transaction.commandes.length})
                                </h3>
                                <div className="space-y-2">
                                    {transaction.commandes.map((commande) => (
                                        <div key={commande.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {commande.id.slice(0, 8)}...
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {commande.statut}
                                                </Badge>
                                                <span className="text-sm font-medium">
                                                    {formatMontant(commande.prix)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Détails JSON */}
                    {transaction.details && Object.keys(transaction.details).length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Détails du provider
                                </h3>
                                <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-32">
                                    {JSON.stringify(transaction.details, null, 2)}
                                </pre>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function TransactionsPage() {
    const {
        transactions,
        isLoading,
        stats,
        fetchTransactions,
    } = useTransactionsStore();

    const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | undefined>(undefined);
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);

    React.useEffect(() => {
        fetchTransactions().finally(() => setIsInitialLoading(false));
    }, [fetchTransactions]);

    const handleView = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsViewModalOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedTransaction(undefined);
    };

    // ========== SKELETON LOADING ==========

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                {/* Skeleton en-tête */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                </div>

                {/* Skeleton stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-9 w-24 mt-1" />
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
                        <Skeleton className="h-6 w-40" />
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
                    <p className="text-muted-foreground">
                        Suivi de tous les paiements effectués sur la plateforme
                    </p>
                </div>
            </div>

            {/* ========== STATISTIQUES ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Montant total encaissé */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Montant encaissé
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold text-green-600">
                            {formatMontant(stats.montant_valide)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {stats.valides} validée{stats.valides > 1 ? 's' : ''}
                            </Badge>
                            <span>sur {stats.total} au total</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Validées */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Validées
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-600">
                            {stats.valides}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Paiements confirmés
                        </p>
                    </CardContent>
                </Card>

                {/* En attente */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            En attente
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-yellow-600">
                            {stats.en_attente}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            En cours de traitement
                        </p>
                    </CardContent>
                </Card>

                {/* Échouées + remboursées */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            Échouées / Remboursées
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-red-600">
                            {stats.echouees + stats.remboursees}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="destructive" className="text-xs">
                                {stats.echouees} échouée{stats.echouees > 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                                {stats.remboursees} remboursée{stats.remboursees > 1 ? 's' : ''}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ========== TABLEAU DES TRANSACTIONS ========== */}
            <Card>
                <CardHeader>
                    <CardTitle>Toutes les transactions</CardTitle>
                    <CardDescription>
                        Consultez l&apos;historique complet des paiements de la plateforme
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TransactionsTable
                        transactions={transactions}
                        isLoading={isLoading}
                        onView={handleView}
                    />
                </CardContent>
            </Card>

            {/* ========== MODAL DE DÉTAILS ========== */}
            <TransactionViewModal
                open={isViewModalOpen}
                onClose={handleCloseViewModal}
                transaction={selectedTransaction}
            />
        </div>
    );
}
