'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, ShieldCheck, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { PermissionGuard } from '@/components/permission-guard';
import { useHasPermission } from '@/stores/authStore';
import {
    useRolesStore,
    type AdminRole,
    type Permission,
} from '@/stores/rolesStore';

const NONE = '__none__';

const ACTION_LABELS: Record<string, string> = {
    read: 'Consulter',
    write: 'Gérer',
    delete: 'Supprimer',
    manage: 'Administrer',
};
const ACTION_ORDER = ['read', 'write', 'delete', 'manage'];

// Regroupe le catalogue par module : { module, libelle, perms: Permission[] }
function groupByModule(permissions: Permission[]) {
    const map = new Map<string, { module: string; libelle: string; perms: Permission[] }>();
    for (const p of permissions) {
        if (!map.has(p.module)) {
            // Libellé du module = partie avant « — » du premier libellé rencontré
            map.set(p.module, { module: p.module, libelle: p.libelle.split('—')[0].trim(), perms: [] });
        }
        map.get(p.module)!.perms.push(p);
    }
    return [...map.values()];
}

// ============================================
// Dialog création / édition d'un rôle
// ============================================
function RoleDialog({
    open,
    onOpenChange,
    editingRole,
    permissions,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editingRole: AdminRole | null;
    permissions: Permission[];
}) {
    const createRole = useRolesStore((s) => s.createRole);
    const updateRole = useRolesStore((s) => s.updateRole);

    const [nom, setNom] = useState('');
    const [description, setDescription] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    const groups = useMemo(() => groupByModule(permissions), [permissions]);

    useEffect(() => {
        if (open) {
            setNom(editingRole?.nom ?? '');
            setDescription(editingRole?.description ?? '');
            setSelected(new Set(editingRole?.permissions ?? []));
        }
    }, [open, editingRole]);

    const togglePerm = (perm: Permission, checked: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(perm.cle);
                // Pour Gérer/Supprimer/Administrer, on garantit aussi Consulter.
                const readKey = `${perm.module}.read`;
                if (perm.action !== 'read' && permissions.some((p) => p.cle === readKey)) {
                    next.add(readKey);
                }
            } else {
                next.delete(perm.cle);
                // Décocher Consulter retire tout le module (incohérent sinon).
                if (perm.action === 'read') {
                    for (const p of permissions) {
                        if (p.module === perm.module) next.delete(p.cle);
                    }
                }
            }
            return next;
        });
    };

    const toggleAll = (checked: boolean) => {
        setSelected(checked ? new Set(permissions.map((p) => p.cle)) : new Set());
    };

    const handleSubmit = async () => {
        const trimmed = nom.trim();
        if (trimmed.length < 2) return;
        setSubmitting(true);
        const payload = {
            nom: trimmed,
            description: description.trim() || null,
            permissions: [...selected],
        };
        const ok = editingRole
            ? await updateRole(editingRole.id, payload)
            : await createRole(payload);
        setSubmitting(false);
        if (ok) onOpenChange(false);
    };

    const allChecked = permissions.length > 0 && selected.size === permissions.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}</DialogTitle>
                    <DialogDescription>
                        Définissez un nom et cochez les permissions accordées à ce rôle.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="role-nom">Nom du rôle</Label>
                        <Input
                            id="role-nom"
                            value={nom}
                            onChange={(e) => setNom(e.target.value)}
                            placeholder="Ex : Support client"
                            autoFocus
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role-desc">Description</Label>
                        <Textarea
                            id="role-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="À quoi sert ce rôle ?"
                            rows={2}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label>Permissions</Label>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                            <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(!!v)} />
                            Tout sélectionner
                        </label>
                    </div>

                    <div className="rounded-md border divide-y">
                        {groups.map((g) => (
                            <div key={g.module} className="p-3">
                                <div className="font-medium text-sm mb-2">{g.libelle}</div>
                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                    {[...g.perms]
                                        .sort(
                                            (a, b) =>
                                                ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action)
                                        )
                                        .map((p) => (
                                            <label
                                                key={p.cle}
                                                className="flex items-center gap-2 text-sm cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={selected.has(p.cle)}
                                                    onCheckedChange={(v) => togglePerm(p, !!v)}
                                                />
                                                {ACTION_LABELS[p.action] ?? p.action}
                                            </label>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || nom.trim().length < 2}>
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enregistrement…
                            </>
                        ) : editingRole ? (
                            'Mettre à jour'
                        ) : (
                            'Créer le rôle'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// Page
// ============================================
function RolesContent() {
    const roles = useRolesStore((s) => s.roles);
    const permissions = useRolesStore((s) => s.permissions);
    const admins = useRolesStore((s) => s.admins);
    const isLoading = useRolesStore((s) => s.isLoading);
    const fetchAll = useRolesStore((s) => s.fetchAll);
    const deleteRole = useRolesStore((s) => s.deleteRole);
    const assignRole = useRolesStore((s) => s.assignRole);

    const canManage = useHasPermission('roles.manage');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        fetchAll().finally(() => setInitialLoading(false));
    }, [fetchAll]);

    const openCreate = () => {
        setEditingRole(null);
        setDialogOpen(true);
    };
    const openEdit = (role: AdminRole) => {
        setEditingRole(role);
        setDialogOpen(true);
    };

    const handleDelete = (role: AdminRole) => {
        if (role.is_system) return;
        if (!confirm(`Supprimer le rôle « ${role.nom} » ? Les admins rattachés perdront leurs droits.`)) {
            return;
        }
        void deleteRole(role.id);
    };

    const rolesById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

    if (initialLoading) {
        return (
            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-4 w-96" />
                <div className="grid gap-4 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rôles & permissions</h1>
                    <p className="text-muted-foreground">
                        Gérez les rôles des administrateurs et leurs accès au dashboard.
                    </p>
                </div>
                {canManage && (
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau rôle
                    </Button>
                )}
            </div>

            <Tabs defaultValue="roles">
                <TabsList>
                    <TabsTrigger value="roles">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Rôles ({roles.length})
                    </TabsTrigger>
                    <TabsTrigger value="affectations">
                        <Users className="mr-2 h-4 w-4" />
                        Affectations ({admins.length})
                    </TabsTrigger>
                </TabsList>

                {/* ----- Onglet Rôles ----- */}
                <TabsContent value="roles" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {roles.map((role) => (
                            <Card key={role.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                {role.nom}
                                                {role.is_system && <Badge variant="secondary">Système</Badge>}
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                {role.description || 'Aucune description'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                        <Badge variant="outline">
                                            {role.is_system ? 'Toutes' : role.permissions_count} permission
                                            {role.is_system || role.permissions_count > 1 ? 's' : ''}
                                        </Badge>
                                        <Badge variant="outline">
                                            {role.users_count} admin{role.users_count > 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEdit(role)}
                                                disabled={role.is_system}
                                            >
                                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                                Modifier
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(role)}
                                                disabled={role.is_system}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ----- Onglet Affectations ----- */}
                <TabsContent value="affectations" className="mt-4">
                    <Card>
                        <CardContent className="pt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Administrateur</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="w-64">Rôle</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {admins.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                                Aucun administrateur.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        admins.map((admin) => (
                                            <TableRow key={admin.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={admin.url_logo ?? undefined} />
                                                            <AvatarFallback>
                                                                {admin.name?.charAt(0).toUpperCase() ?? '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{admin.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={admin.admin_role_id ?? NONE}
                                                        disabled={!canManage}
                                                        onValueChange={(v) =>
                                                            assignRole(admin.id, v === NONE ? null : v)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Aucun rôle" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value={NONE}>Aucun rôle</SelectItem>
                                                            {roles.map((r) => (
                                                                <SelectItem key={r.id} value={r.id}>
                                                                    {r.nom}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {admin.admin_role_id && !rolesById.has(admin.admin_role_id) && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Rôle inconnu
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {canManage && (
                <RoleDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    editingRole={editingRole}
                    permissions={permissions}
                />
            )}
        </div>
    );
}

export default function RolesPage() {
    return (
        <PermissionGuard permission="roles.read">
            <RolesContent />
        </PermissionGuard>
    );
}
