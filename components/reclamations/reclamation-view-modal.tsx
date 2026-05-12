// components/reclamations/reclamation-view-modal.tsx
'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    User,
    Phone,
    Mail,
    ShoppingBag,
    Calendar,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    MessageSquare,
} from "lucide-react";
import { type Reclamation, type ReclamationStatut, useReclamationsStore } from '@/stores/reclamationsStore';

// ============================================
// PROPS
// ============================================

interface ReclamationViewModalProps {
    open: boolean;
    onClose: () => void;
    reclamation: Reclamation | undefined;
}

// ============================================
// HELPERS
// ============================================

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatPrice = (prix: number) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
    }).format(prix);
};

const getStatutConfig = (statut: ReclamationStatut) => {
    switch (statut) {
        case 'En attente de traitement':
            return { icon: Clock, className: 'text-amber-600 border-amber-300 bg-amber-50' };
        case 'En cours':
            return { icon: RefreshCw, className: 'text-blue-600 border-blue-300 bg-blue-50' };
        case 'Rejetée':
            return { icon: XCircle, className: 'text-red-600 border-red-300 bg-red-50' };
        case 'Remboursée':
            return { icon: CheckCircle, className: 'text-green-600 border-green-300 bg-green-50' };
    }
};

const STATUTS: ReclamationStatut[] = [
    'En attente de traitement',
    'En cours',
    'Rejetée',
    'Remboursée',
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function ReclamationViewModal({ open, onClose, reclamation }: ReclamationViewModalProps) {
    const { updateStatut, isLoading } = useReclamationsStore();
    const [selectedStatut, setSelectedStatut] = React.useState<ReclamationStatut | undefined>(undefined);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (reclamation) {
            setSelectedStatut(reclamation.statut);
        }
    }, [reclamation]);

    if (!reclamation) return null;

    const statutConfig = getStatutConfig(reclamation.statut);
    const StatutIcon = statutConfig.icon;
    const hasStatutChanged = selectedStatut && selectedStatut !== reclamation.statut;

    const handleSaveStatut = async () => {
        if (!selectedStatut || !hasStatutChanged) return;
        setIsSaving(true);
        try {
            await updateStatut(reclamation.id, selectedStatut);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Détails de la réclamation
                    </DialogTitle>
                    <DialogDescription>
                        Soumise le {formatDate(reclamation.created_at)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Statut actuel */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Statut actuel</span>
                        <Badge variant="outline" className={statutConfig.className}>
                            <StatutIcon className="mr-1.5 h-3.5 w-3.5" />
                            {reclamation.statut}
                        </Badge>
                    </div>

                    <Separator />

                    {/* Informations client */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Informations client
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1">Nom</p>
                                <p className="text-sm font-medium">{reclamation.users?.name ?? '—'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> Email
                                </p>
                                <p className="text-sm font-medium truncate">{reclamation.users?.email ?? '—'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> Téléphone (profil)
                                </p>
                                <p className="text-sm font-medium">{reclamation.users?.phone ?? '—'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> Téléphone (réclamation)
                                </p>
                                <p className="text-sm font-medium">{reclamation.phone}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Commande associée */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            Commande associée
                        </h3>
                        {reclamation.commandes ? (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Numéro</p>
                                    <p className="text-sm font-mono font-semibold">#{reclamation.commandes.numero}</p>
                                </div>
                                <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Statut</p>
                                    <p className="text-sm font-medium">{reclamation.commandes.statut}</p>
                                </div>
                                <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Montant</p>
                                    <p className="text-sm font-semibold">{formatPrice(reclamation.commandes.prix)}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Commande introuvable</p>
                        )}
                    </div>

                    <Separator />

                    {/* Description de la réclamation */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Description
                        </h3>
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <p className="text-sm leading-relaxed">{reclamation.description}</p>
                        </div>
                    </div>

                    {/* Réponse admin (si existante) */}
                    {reclamation.reponse && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-blue-600" />
                                    Réponse de l'administration
                                </h3>
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                    <p className="text-sm leading-relaxed text-blue-900">{reclamation.reponse}</p>
                                </div>
                            </div>
                        </>
                    )}

                    <Separator />

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Créée le {formatDate(reclamation.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Mise à jour le {formatDate(reclamation.updated_at)}</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Mise à jour du statut */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Changer le statut</h3>
                        <div className="flex items-center gap-3">
                            <Select
                                value={selectedStatut}
                                onValueChange={(value) => setSelectedStatut(value as ReclamationStatut)}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Sélectionner un statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUTS.map((statut) => {
                                        const config = getStatutConfig(statut);
                                        const Icon = config.icon;
                                        return (
                                            <SelectItem key={statut} value={statut}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-3.5 w-3.5" />
                                                    {statut}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleSaveStatut}
                                disabled={!hasStatutChanged || isSaving || isLoading}
                            >
                                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
