// components/notifications/notification-send-modal.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
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
import { Send, X, Search, Users, UserCheck } from "lucide-react";
import { useNotificationsStore, type SendNotificationInput, type NotificationType } from '@/stores/notificationsStore';
import { useAuthStore } from '@/stores/authStore';

// ============================================
// TYPES
// ============================================

interface AppUser {
    id: string;
    name: string;
    email: string;
    role: string;
    url_logo?: string | null;
    is_active: boolean;
}

const ROLES = [
    { value: 'Administrateur', label: 'Administrateurs', color: 'text-red-600' },
    { value: 'Vendeur',        label: 'Vendeurs',        color: 'text-blue-600' },
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

const sendSchema = z.object({
    type: z.enum(['commande', 'livraison', 'message', 'promotion', 'alerte_stock', 'avis', 'systeme']),
    titre: z.string().min(1, "Le titre est requis").max(150, "Maximum 150 caractères"),
    message: z.string().min(1, "Le message est requis").max(500, "Maximum 500 caractères"),
    lien: z.string().url("URL invalide").optional().or(z.literal('')),
});

type SendFormValues = z.infer<typeof sendSchema>;

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
    const { sendNotification, isLoading } = useNotificationsStore();
    const token = useAuthStore(s => s.token);

    // --- Données utilisateurs ---
    const [allUsers, setAllUsers] = React.useState<AppUser[]>([]);
    const [usersLoading, setUsersLoading] = React.useState(false);

    // --- Onglet actif ---
    const [tab, setTab] = React.useState<'utilisateurs' | 'roles'>('utilisateurs');

    // --- Onglet "Par utilisateur" ---
    const [search, setSearch] = React.useState('');
    const [selectedUserIds, setSelectedUserIds] = React.useState<Set<string>>(new Set());

    // --- Onglet "Par rôle" ---
    const [selectedRoles, setSelectedRoles] = React.useState<Set<string>>(new Set());

    const form = useForm<SendFormValues>({
        resolver: zodResolver(sendSchema),
        defaultValues: { type: 'systeme', titre: '', message: '', lien: '' },
    });

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
        form.reset();
        setSearch('');
        setSelectedUserIds(new Set());
        setSelectedRoles(new Set());
        setTab('utilisateurs');
        onClose();
    };

    // --- Helpers onglet utilisateurs ---
    const filteredUsers = React.useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return allUsers;
        return allUsers.filter(u =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q)
        );
    }, [allUsers, search]);

    const toggleUser = (id: string) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAllFiltered = () => {
        const allSelected = filteredUsers.every(u => selectedUserIds.has(u.id));
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            filteredUsers.forEach(u => allSelected ? next.delete(u.id) : next.add(u.id));
            return next;
        });
    };

    // --- Helpers onglet rôles ---
    const toggleRole = (role: string) => {
        setSelectedRoles(prev => {
            const next = new Set(prev);
            next.has(role) ? next.delete(role) : next.add(role);
            return next;
        });
    };

    const countByRole = (role: string) => allUsers.filter(u => u.role === role).length;

    // IDs résolus selon l'onglet actif
    const resolvedIds = React.useMemo(() => {
        if (tab === 'utilisateurs') {
            return [...selectedUserIds];
        }
        return allUsers
            .filter(u => selectedRoles.has(u.role))
            .map(u => u.id);
    }, [tab, selectedUserIds, selectedRoles, allUsers]);

    const hasDestinatairies = resolvedIds.length > 0;

    // Initiales pour l'avatar
    const getInitials = (name: string) =>
        name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

    const onSubmit = async (values: SendFormValues) => {
        if (!hasDestinatairies) return;
        const payload: SendNotificationInput = {
            user_ids: resolvedIds,
            type: values.type as NotificationType,
            titre: values.titre,
            message: values.message,
            lien: values.lien || undefined,
        };
        await sendNotification(payload);
        handleClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
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

                <div className="flex-1 overflow-y-auto">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                            {/* ===== DESTINATAIRES ===== */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Destinataires</p>
                                    {hasDestinatairies && (
                                        <Badge variant="default" className="text-xs">
                                            {resolvedIds.length} sélectionné(s)
                                        </Badge>
                                    )}
                                </div>

                                <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                                    <TabsList className="w-full">
                                        <TabsTrigger value="utilisateurs" className="flex-1 gap-2">
                                            <UserCheck className="h-4 w-4" />
                                            Par utilisateur
                                        </TabsTrigger>
                                        <TabsTrigger value="roles" className="flex-1 gap-2">
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
                                            />
                                        </div>

                                        {/* Tout sélectionner */}
                                        {filteredUsers.length > 0 && (
                                            <div className="flex items-center gap-2 px-1">
                                                <Checkbox
                                                    id="select-all"
                                                    checked={filteredUsers.every(u => selectedUserIds.has(u.id))}
                                                    onCheckedChange={toggleAllFiltered}
                                                />
                                                <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                                                    {filteredUsers.every(u => selectedUserIds.has(u.id))
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
                                                    {filteredUsers.map(user => (
                                                        <div
                                                            key={user.id}
                                                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${selectedUserIds.has(user.id) ? 'bg-muted' : ''}`}
                                                            onClick={() => toggleUser(user.id)}
                                                        >
                                                            <Checkbox
                                                                checked={selectedUserIds.has(user.id)}
                                                                onCheckedChange={() => toggleUser(user.id)}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                            <Avatar className="h-8 w-8 shrink-0">
                                                                <AvatarImage src={user.url_logo ?? undefined} />
                                                                <AvatarFallback className="text-xs">
                                                                    {getInitials(user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{user.name}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                            </div>
                                                            <Badge variant="outline" className="text-xs shrink-0">
                                                                {user.role}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    {/* ---- Onglet rôles ---- */}
                                    <TabsContent value="roles" className="mt-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            {ROLES.map(role => {
                                                const count = countByRole(role.value);
                                                const checked = selectedRoles.has(role.value);
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
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sélectionner un type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {NOTIFICATION_TYPES.map(t => (
                                                        <SelectItem key={t.value} value={t.value}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Titre */}
                                <FormField
                                    control={form.control}
                                    name="titre"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Titre</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Titre de la notification" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Message */}
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Message</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Contenu de la notification"
                                                rows={3}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Lien (optionnel) */}
                            <FormField
                                control={form.control}
                                name="lien"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lien (optionnel)</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="https://..." type="url" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    <X className="mr-2 h-4 w-4" />
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={isLoading || !hasDestinatairies}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isLoading
                                        ? 'Envoi...'
                                        : `Envoyer à ${resolvedIds.length} utilisateur(s)`
                                    }
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
