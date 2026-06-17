// components/notifications/notification-edit-modal.tsx
'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, X, Loader2 } from "lucide-react";
import {
    useNotificationsStore,
    type AdminNotification,
    type NotificationType,
    type UpdateNotificationInput,
} from '@/stores/notificationsStore';
import { toast } from "sonner";

const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
    { value: 'commande',     label: 'Commande' },
    { value: 'livraison',    label: 'Livraison' },
    { value: 'message',      label: 'Message' },
    { value: 'promotion',    label: 'Promotion' },
    { value: 'alerte_stock', label: 'Alerte stock' },
    { value: 'avis',         label: 'Avis' },
    { value: 'systeme',      label: 'Système' },
];

interface NotificationFormState {
    type: NotificationType;
    titre: string;
    message: string;
    lien: string;
}

interface NotificationEditModalProps {
    notification: AdminNotification | null;
    open: boolean;
    onClose: () => void;
}

export function NotificationEditModal({ notification, open, onClose }: NotificationEditModalProps) {
    const { updateNotification, isLoading } = useNotificationsStore();

    const [form, setForm] = React.useState<NotificationFormState>({
        type: 'systeme', titre: '', message: '', lien: '',
    });
    const [errors, setErrors] = React.useState<Partial<Record<keyof NotificationFormState, string>>>({});

    // Pré-remplir à l'ouverture
    React.useEffect(() => {
        if (notification) {
            setForm({
                type: notification.type,
                titre: notification.titre,
                message: notification.message,
                lien: notification.lien ?? '',
            });
            setErrors({});
        }
    }, [notification]);

    const handleChange = (field: keyof NotificationFormState, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validate = () => {
        const e: Partial<Record<keyof NotificationFormState, string>> = {};
        if (!form.titre.trim()) e.titre = 'Le titre est requis';
        else if (form.titre.length > 150) e.titre = 'Maximum 150 caractères';
        if (!form.message.trim()) e.message = 'Le message est requis';
        else if (form.message.length > 500) e.message = 'Maximum 500 caractères';
        if (form.lien.trim() && !/^https?:\/\//i.test(form.lien.trim())) e.lien = 'URL invalide';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!notification || !validate()) return;
        try {
            const payload: UpdateNotificationInput = {
                type: form.type,
                titre: form.titre.trim(),
                message: form.message.trim(),
                lien: form.lien.trim() || null,
            };
            await updateNotification(notification.id, payload);
            toast.success('Notification modifiée');
            onClose();
        } catch (error) {
            toast.error("Erreur lors de la modification", {
                description: error instanceof Error ? error.message : 'Réessayez plus tard',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Modifier la notification
                    </DialogTitle>
                    <DialogDescription>
                        Modifiez le contenu de la notification. Les changements sont appliqués immédiatement.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select
                                value={form.type}
                                onValueChange={(v) => handleChange('type', v)}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {NOTIFICATION_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-titre">Titre</Label>
                            <Input
                                id="edit-titre"
                                value={form.titre}
                                onChange={(e) => handleChange('titre', e.target.value)}
                                className={errors.titre ? 'border-destructive' : ''}
                                disabled={isLoading}
                            />
                            {errors.titre && <p className="text-xs text-destructive">{errors.titre}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-message">Message</Label>
                        <Textarea
                            id="edit-message"
                            rows={4}
                            value={form.message}
                            onChange={(e) => handleChange('message', e.target.value)}
                            className={errors.message ? 'border-destructive' : ''}
                            disabled={isLoading}
                        />
                        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-lien">Lien (optionnel)</Label>
                        <Input
                            id="edit-lien"
                            placeholder="https://..."
                            type="url"
                            value={form.lien}
                            onChange={(e) => handleChange('lien', e.target.value)}
                            className={errors.lien ? 'border-destructive' : ''}
                            disabled={isLoading}
                        />
                        {errors.lien && <p className="text-xs text-destructive">{errors.lien}</p>}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        <X className="mr-2 h-4 w-4" />
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Pencil className="mr-2 h-4 w-4" />
                        )}
                        {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
