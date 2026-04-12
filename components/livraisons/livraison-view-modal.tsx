// components/livraisons/livraison-view-modal.tsx
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
    MapPin,
    Truck,
    Clock,
    CheckCircle,
    XCircle,
    FileText,
} from "lucide-react";
import {
    type Livraison,
    type LivraisonStatut,
    normalizeStatut,
    useLivraisonsStore,
} from '@/stores/livraisonsStore';

// ============================================
// PROPS
// ============================================

interface LivraisonViewModalProps {
    open: boolean;
    onClose: () => void;
    livraison: Livraison | undefined;
}

// ============================================
// HELPERS
// ============================================

const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatPrice = (prix: number) =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
    }).format(prix);

const getStatutConfig = (statut: string) => {
    const normalized = normalizeStatut(statut);
    switch (normalized) {
        case 'En attente':
            return { icon: Clock, className: 'text-amber-600 border-amber-300 bg-amber-50' };
        case 'Attribuée':
            return { icon: Truck, className: 'text-blue-600 border-blue-300 bg-blue-50' };
        case 'En cours de livraison':
            return { icon: Truck, className: 'text-orange-600 border-orange-300 bg-orange-50' };
        case 'Livrée':
            return { icon: CheckCircle, className: 'text-green-600 border-green-300 bg-green-50' };
        case 'Annulée':
            return { icon: XCircle, className: 'text-red-600 border-red-300 bg-red-50' };
        default:
            return { icon: Clock, className: 'text-gray-600 border-gray-300 bg-gray-50' };
    }
};

const STATUTS: LivraisonStatut[] = [
    'En attente',
    'En cours de livraison',
    'Livrée',
    'Annulée',
    'Reportée',
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function LivraisonViewModal({ open, onClose, livraison }: LivraisonViewModalProps) {
    const { updateStatut, isLoading } = useLivraisonsStore();
    const [selectedStatut, setSelectedStatut] = React.useState<LivraisonStatut | undefined>(undefined);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (livraison) {
            setSelectedStatut(normalizeStatut(livraison.statut) as LivraisonStatut);
        }
    }, [livraison]);

    if (!livraison) return null;

    const statutConfig = getStatutConfig(livraison.statut);
    const StatutIcon = statutConfig.icon;
    const displayStatut = normalizeStatut(livraison.statut);
    const hasStatutChanged = selectedStatut && selectedStatut !== displayStatut;

    const handleSaveStatut = async () => {
        if (!selectedStatut || !hasStatutChanged) return;
        setIsSaving(true);
        try {
            await updateStatut(livraison.id, selectedStatut);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Détails de la livraison
                    </DialogTitle>
                    <DialogDescription>
                        Créée le {formatDate(livraison.created_at)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Statut actuel */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Statut actuel</span>
                        <Badge variant="outline" className={statutConfig.className}>
                            <StatutIcon className="mr-1.5 h-3.5 w-3.5" />
                            {displayStatut}
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
                                <p className="text-sm font-medium">{livraison.users?.name ?? '—'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> Email
                                </p>
                                <p className="text-sm font-medium truncate">{livraison.users?.email ?? '—'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> Téléphone (profil)
                                </p>
                                <p className="text-sm font-medium">{livraison.users?.phone ?? '—'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> Téléphone (livraison)
                                </p>
                                <p className="text-sm font-medium">{livraison.phone}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Adresse de livraison */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Adresse de livraison
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                                <p className="text-xs text-muted-foreground mb-1">Adresse complète</p>
                                <p className="text-sm font-medium">{livraison.adresse}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1">Ville</p>
                                <p className="text-sm font-medium">{livraison.ville}</p>
                            </div>
                            {livraison.details && (
                                <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Détails</p>
                                    <p className="text-sm font-medium">{livraison.details}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Commande associée */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            Commande associée
                        </h3>
                        {livraison.commandes ? (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Numéro</p>
                                    <p className="text-sm font-mono font-semibold">#{livraison.commandes.numero}</p>
                                </div>
                                <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Statut commande</p>
                                    <p className="text-sm font-medium">{livraison.commandes.statut}</p>
                                </div>
                                <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Montant</p>
                                    <p className="text-sm font-semibold">{formatPrice(livraison.commandes.prix)}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Commande introuvable</p>
                        )}
                    </div>

                    <Separator />

                    {/* Dates */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Dates
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1">Date prévue</p>
                                <p className="text-sm font-medium">{formatDate(livraison.date_livraison)}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1">Créée le</p>
                                <p className="text-sm font-medium">{formatDate(livraison.created_at)}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1">Modifiée le</p>
                                <p className="text-sm font-medium">{formatDate(livraison.updated_at)}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Mise à jour du statut */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Changer le statut
                        </h3>
                        <div className="flex items-center gap-3">
                            <Select
                                value={selectedStatut}
                                onValueChange={(value) => setSelectedStatut(value as LivraisonStatut)}
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
