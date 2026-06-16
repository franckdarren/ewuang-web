// components/notifications/notification-send-modal.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, X, Search, Users, UserCheck, Loader2 } from "lucide-react";
import { useNotificationsStore, type SendNotificationInput, type NotificationType } from '@/stores/notificationsStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

interface AppUser {
    id: string;
    name?: string | null;
    owner_name?: string | null;
    email?: string | null;
    role?: string | null;
    url_logo?: string | null;
    is_active: boolean;
}

interface NotificationFormState {
    type: NotificationType;
    titre: string;
    message: string;
    lien: string;
}

const ROLES = [
    { value: 'Administrateur', label: 'Administrateurs', color: 'text-red-600' },
    { value: 'Boutique',       label: 'Boutiques',       color: 'text-blue-600' },
    { value: 'Livreur',        label: 'Livreurs',        color: 'text-green-600' },
    { value: 'Client',         label: 'Clients',         color: 'text-orange-600' },
];

const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
    { value: 'commande',     label: 'Commande' },
    { value: 'livraison',    label: 'Livraison' },
    { value: 'message',      label: 'Message' },
    { value: 'promotion',    label: 'Promotion' },
    { value: 'alerte_stock', label: 'Alerte stock' },
    { value: 'avis',         label: 'Avis' },
    { value: 'systeme',      label: 'Système' },
];

const EMPTY_FORM: NotificationFormState = { type: 'systeme', titre: '', message: '', lien: '' };

// ============================================
// PROPS
// ============================================

interface NotificationSendModalProps {
    open: boolean;
    onClose: () => void;
}

// ============================================
// COMPOSANT
// ============================================

export function NotificationSendModal({ open, onClose }: NotificationSendModalProps) {
    const { sendNotification, isLoading: isSending } = useNotificationsStore();
    const token = useAuthStore(s => s.token);

    // --- Données utilisateurs ---
    const [allUsers, setAllUsers] = React.useState<AppUser[]>([]);
    const [usersLoading, setUsersLoading] = React.useState(false);

    // --- Onglet actif ---
    const [tab, setTab] = React.useState<'utilisateurs' | 'roles'>('utilisateurs');

    // --- Onglet "Par utilisateur" ---
    const [search, setSearch] = React.useState('');
    const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);

    // --- Onglet "Par rôle" ---
    const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);

    // --- Contenu de la notification ---
    const [form, setForm] = React.useState<NotificationFormState>(EMPTY_FORM);
    const [errors, setErrors] = React.useState<Partial<Record<keyof NotificationFormState, string>>>({});

    // Charger les utilisateurs à l'ouverture
    React.useEffect(() => {
        if (!open || !token) return;
        setUsersLoading(true);
        fetch('/api/users/list', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then((data: AppUser[]) => setAllUsers(Array.isArray(data) ? data : []))
            .catch(() => setAllUsers([]))
            .finally(() => setUsersLoading(false));
    }, [open, token]);

    // Réinitialiser à la fermeture
    const handleClose = () => {
        setForm(EMPTY_FORM);
        setErrors({});
        setSearch('');
        setSelectedUserIds([]);
        setSelectedRoles([]);
        setTab('utilisateurs');
        onClose();
    };

    const handleChange = (field: keyof NotificationFormState, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    // --- Helpers onglet utilisateurs ---
    const filteredUsers = React.useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return allUsers;
        return allUsers.filter(u =>
            (u.name ?? '').toLowerCase().includes(q) ||
            (u.email ?? '').toLowerCase().includes(q) ||
            (u.role ?? '').toLowerCase().includes(q)
        );
    }, [allUsers, search]);

    const toggleUser = (id: string) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id));

    const toggleAllFiltered = () => {
        const filteredIds = filteredUsers.map(u => u.id);
        setSelectedUserIds(prev =>
            allFilteredSelected
                ? prev.filter(id => !filteredIds.includes(id))
                : Array.from(new Set([...prev, ...filteredIds]))
        );
    };

    // --- Helpers onglet rôles ---
    const toggleRole = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const countByRole = (role: string) => allUsers.filter(u => u.role === role).length;

    // IDs résolus selon l'onglet actif
    const resolvedIds = React.useMemo(() => {
        if (tab === 'utilisateurs') {
            return selectedUserIds;
        }
        return allUsers
            .filter(u => u.role != null && selectedRoles.includes(u.role))
            .map(u => u.id);
    }, [tab, selectedUserIds, selectedRoles, allUsers]);

    const hasDestinataires = resolvedIds.length > 0;

    // Initiales pour l'avatar (robuste aux noms null/vides — ex. comptes Boutique).
    const getInitials = (name?: string | null) => {
        const initials = (name ?? '')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(p => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        return initials || '?';
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
        if (!hasDestinataires || !validate()) return;
        try {
            const payload: SendNotificationInput = {
                user_ids: resolvedIds,
                type: form.type,
                titre: form.titre.trim(),
                message: form.message.trim(),
                lien: form.lien.trim() || undefined,
            };
            await sendNotification(payload);
            toast.success('Notification envoyée', {
                description: `${resolvedIds.length} destinataire(s)`,
            });
            handleClose();
        } catch (error) {
            toast.error("Erreur lors de l'envoi", {
                description: error instanceof Error ? error.message : 'Réessayez plus tard',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Envoyer une notification
                    </DialogTitle>
                    <DialogDescription>
                        Sélectionnez les destinataires puis rédigez votre notification.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 pr-3 space-y-5">

                    {/* ===== DESTINATAIRES ===== */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Destinataires</p>
                            {hasDestinataires && (
                                <Badge variant="default" className="text-xs">
                                    {resolvedIds.length} sélectionné(s)
                                </Badge>
                            )}
                        </div>

                        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                            <TabsList className="w-full">
                                <TabsTrigger value="utilisateurs" className="flex-1 gap-2" disabled={isSending}>
                                    <UserCheck className="h-4 w-4" />
                                    Par utilisateur
                                </TabsTrigger>
                                <TabsTrigger value="roles" className="flex-1 gap-2" disabled={isSending}>
                                    <Users className="h-4 w-4" />
                                    Par rôle
                                </TabsTrigger>
                            </TabsList>

                            {/* ---- Onglet utilisateurs ---- */}
                            <TabsContent value="utilisateurs" className="mt-3 space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher par nom, email ou rôle..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="pl-9"
                                        disabled={isSending}
                                    />
                                </div>

                                {/* Tout sélectionner */}
                                {filteredUsers.length > 0 && (
                                    <div className="flex items-center gap-2 px-1">
                                        <Checkbox
                                            id="select-all"
                                            checked={allFilteredSelected}
                                            onCheckedChange={toggleAllFiltered}
                                            disabled={isSending}
                                        />
                                        <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                                            {allFilteredSelected
                                                ? 'Tout désélectionner'
                                                : `Tout sélectionner (${filteredUsers.length})`
                                            }
                                        </label>
                                    </div>
                                )}

                                <div className="h-48 overflow-y-auto rounded-md border">
                                    {usersLoading ? (
                                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                            Chargement...
                                        </div>
                                    ) : filteredUsers.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                            Aucun utilisateur trouvé
                                        </div>
                                    ) : (
                                        <div className="p-2 space-y-1">
                                            {filteredUsers.map(user => {
                                                const checked = selectedUserIds.includes(user.id);
                                                return (
                                                    <div
                                                        key={user.id}
                                                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${checked ? 'bg-muted' : ''}`}
                                                        onClick={() => toggleUser(user.id)}
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={() => toggleUser(user.id)}
                                                            onClick={e => e.stopPropagation()}
                                                            disabled={isSending}
                                                        />
                                                        <Avatar className="h-8 w-8 shrink-0">
                                                            <AvatarImage src={user.url_logo ?? undefined} />
                                                            <AvatarFallback className="text-xs">
                                                                {getInitials(user.name ?? user.owner_name ?? user.email)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {user.name || user.owner_name || user.email || 'Sans nom'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">{user.email ?? '—'}</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs shrink-0">
                                                            {user.role ?? '—'}
                                                        </Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* ---- Onglet rôles ---- */}
                            <TabsContent value="roles" className="mt-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {ROLES.map(role => {
                                        const count = countByRole(role.value);
                                        const checked = selectedRoles.includes(role.value);
                                        return (
                                            <div
                                                key={role.value}
                                                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted ${checked ? 'bg-muted border-primary' : ''}`}
                                                onClick={() => toggleRole(role.value)}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => toggleRole(role.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    disabled={isSending}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium ${role.color}`}>
                                                        {role.label}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {usersLoading ? '...' : `${count} utilisateur${count !== 1 ? 's' : ''}`}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {resolvedIds.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-3 text-center">
                                        {resolvedIds.length} destinataire(s) au total
                                    </p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* ===== CONTENU DE LA NOTIFICATION ===== */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Type */}
                        <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select
                                value={form.type}
                                onValueChange={(v) => handleChange('type', v)}
                                disabled={isSending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un type" />
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

                        {/* Titre */}
                        <div className="space-y-1.5">
                            <Label htmlFor="notif-titre">Titre</Label>
                            <Input
                                id="notif-titre"
                                placeholder="Titre de la notification"
                                value={form.titre}
                                onChange={(e) => handleChange('titre', e.target.value)}
                                className={errors.titre ? 'border-destructive' : ''}
                                disabled={isSending}
                            />
                            {errors.titre && <p className="text-xs text-destructive">{errors.titre}</p>}
                        </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                        <Label htmlFor="notif-message">Message</Label>
                        <Textarea
                            id="notif-message"
                            placeholder="Contenu de la notification"
                            rows={3}
                            value={form.message}
                            onChange={(e) => handleChange('message', e.target.value)}
                            className={errors.message ? 'border-destructive' : ''}
                            disabled={isSending}
                        />
                        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                    </div>

                    {/* Lien (optionnel) */}
                    <div className="space-y-1.5">
                        <Label htmlFor="notif-lien">Lien (optionnel)</Label>
                        <Input
                            id="notif-lien"
                            placeholder="https://..."
                            type="url"
                            value={form.lien}
                            onChange={(e) => handleChange('lien', e.target.value)}
                            className={errors.lien ? 'border-destructive' : ''}
                            disabled={isSending}
                        />
                        {errors.lien && <p className="text-xs text-destructive">{errors.lien}</p>}
                    </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSending}>
                        <X className="mr-2 h-4 w-4" />
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSending || !hasDestinataires}>
                        {isSending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        {isSending
                            ? 'Envoi...'
                            : `Envoyer à ${resolvedIds.length} utilisateur(s)`
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
