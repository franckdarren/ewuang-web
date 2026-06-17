// components/notifications/admin-notifications-table.tsx
'use client';

import * as React from "react";
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import {
    ArrowUpDown,
    MoreHorizontal,
    Trash2,
    Bell,
    ExternalLink,
    Pencil,
    RefreshCw,
    X,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type AdminNotification, type NotificationType } from '@/stores/notificationsStore';

// ============================================
// PROPS
// ============================================

interface AdminNotificationsTableProps {
    notifications: AdminNotification[];
    isLoading: boolean;
    onEdit: (notification: AdminNotification) => void;
    onResend: (notification: AdminNotification) => void;
    onDelete: (notification: AdminNotification) => void;
}

// ============================================
// HELPERS
// ============================================

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const TYPE_CONFIG: Record<NotificationType, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    commande:     { label: 'Commande',     variant: 'default' },
    livraison:    { label: 'Livraison',    variant: 'outline' },
    message:      { label: 'Message',      variant: 'secondary' },
    promotion:    { label: 'Promotion',    variant: 'default' },
    alerte_stock: { label: 'Stock',        variant: 'destructive' },
    avis:         { label: 'Avis',         variant: 'secondary' },
    systeme:      { label: 'Système',      variant: 'outline' },
};

const ROLE_COLORS: Record<string, string> = {
    Administrateur: 'text-red-600',
    Boutique:       'text-blue-600',
    Livreur:        'text-green-600',
    Client:         'text-orange-600',
};

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

// ============================================
// COLONNES
// ============================================

const createColumns = (
    onEdit: (n: AdminNotification) => void,
    onResend: (n: AdminNotification) => void,
    onDelete: (n: AdminNotification) => void,
): ColumnDef<AdminNotification>[] => [
    {
        accessorKey: "titre",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Notification
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const n = row.original;
            return (
                <div className="flex items-start gap-2 max-w-[280px]">
                    <Bell className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate text-sm">{n.titre}</span>
                        <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                        {n.lien && (
                            <a
                                href={n.lien}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="h-3 w-3" />
                                Voir le lien
                            </a>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
            const type = row.getValue("type") as NotificationType;
            const config = TYPE_CONFIG[type];
            return <Badge variant={config?.variant ?? 'secondary'}>{config?.label ?? type}</Badge>;
        },
    },
    {
        id: "destinataire",
        header: "Destinataire",
        cell: ({ row }) => {
            const n = row.original;
            const displayName = n.user_name ?? n.user_email ?? 'Inconnu';
            return (
                <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate max-w-[140px]">{displayName}</span>
                        {n.user_role && (
                            <span className={`text-xs ${ROLE_COLORS[n.user_role] ?? 'text-muted-foreground'}`}>
                                {n.user_role}
                            </span>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "is_read",
        header: "Lu",
        cell: ({ row }) => {
            const isRead = row.getValue("is_read") as boolean;
            return (
                <Badge variant={isRead ? 'secondary' : 'default'}>
                    {isRead ? 'Lu' : 'Non lu'}
                </Badge>
            );
        },
    },
    {
        accessorKey: "created_at",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDate(row.getValue("created_at"))}
            </div>
        ),
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const n = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(n.id)}>
                            Copier l'ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(n)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onResend(n)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Renvoyer le push
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete(n)}
                            className="text-red-600 focus:text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

// ============================================
// ÉTAT DES FILTRES
// ============================================

interface FilterState {
    search: string;
    type: NotificationType | 'tous';
    statut: 'tous' | 'lu' | 'non_lu';
    role: string;
}

const EMPTY_FILTERS: FilterState = { search: '', type: 'tous', statut: 'tous', role: 'tous' };

function applyFilters(notifications: AdminNotification[], filters: FilterState): AdminNotification[] {
    return notifications.filter((n) => {
        if (filters.search.trim()) {
            const q = filters.search.toLowerCase();
            const inTitre   = n.titre.toLowerCase().includes(q);
            const inMessage = n.message.toLowerCase().includes(q);
            const inNom     = (n.user_name ?? '').toLowerCase().includes(q);
            const inEmail   = (n.user_email ?? '').toLowerCase().includes(q);
            if (!inTitre && !inMessage && !inNom && !inEmail) return false;
        }
        if (filters.type !== 'tous' && n.type !== filters.type) return false;
        if (filters.statut === 'lu' && !n.is_read) return false;
        if (filters.statut === 'non_lu' && n.is_read) return false;
        if (filters.role !== 'tous' && n.user_role !== filters.role) return false;
        return true;
    });
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function AdminNotificationsTable({
    notifications,
    isLoading,
    onEdit,
    onResend,
    onDelete,
}: AdminNotificationsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: "created_at", desc: true }]);
    const [filters, setFilters] = React.useState<FilterState>(EMPTY_FILTERS);

    const filtered = React.useMemo(() => applyFilters(notifications, filters), [notifications, filters]);

    const hasActiveFilters = filters.search !== '' || filters.type !== 'tous' || filters.statut !== 'tous' || filters.role !== 'tous';

    const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => setFilters(EMPTY_FILTERS);

    // Rôles présents dans les données (pour peupler le select dynamiquement)
    const availableRoles = React.useMemo(() => {
        const roles = new Set<string>();
        notifications.forEach(n => { if (n.user_role) roles.add(n.user_role); });
        return Array.from(roles).sort();
    }, [notifications]);

    const columns = React.useMemo(
        () => createColumns(onEdit, onResend, onDelete),
        [onEdit, onResend, onDelete]
    );

    const table = useReactTable({
        data: filtered,
        columns,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
        initialState: { pagination: { pageSize: 20 } },
    });

    return (
        <div className="w-full space-y-4">
            {/* ===== BARRE DE FILTRES ===== */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Recherche */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Titre, message, nom, email..."
                        value={filters.search}
                        onChange={(e) => setFilter('search', e.target.value)}
                        className="pl-9"
                    />
                    {filters.search && (
                        <button
                            onClick={() => setFilter('search', '')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Type */}
                <Select
                    value={filters.type}
                    onValueChange={(v) => setFilter('type', v as FilterState['type'])}
                >
                    <SelectTrigger className="w-[155px]">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="tous">Tous les types</SelectItem>
                        <SelectItem value="commande">Commande</SelectItem>
                        <SelectItem value="livraison">Livraison</SelectItem>
                        <SelectItem value="message">Message</SelectItem>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="alerte_stock">Alerte stock</SelectItem>
                        <SelectItem value="avis">Avis</SelectItem>
                        <SelectItem value="systeme">Système</SelectItem>
                    </SelectContent>
                </Select>

                {/* Statut lu */}
                <Select
                    value={filters.statut}
                    onValueChange={(v) => setFilter('statut', v as FilterState['statut'])}
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="tous">Tous statuts</SelectItem>
                        <SelectItem value="non_lu">Non lues</SelectItem>
                        <SelectItem value="lu">Lues</SelectItem>
                    </SelectContent>
                </Select>

                {/* Rôle destinataire */}
                <Select
                    value={filters.role}
                    onValueChange={(v) => setFilter('role', v)}
                >
                    <SelectTrigger className="w-[155px]">
                        <SelectValue placeholder="Rôle" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="tous">Tous les rôles</SelectItem>
                        {availableRoles.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Effacer les filtres */}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                        Effacer
                    </Button>
                )}
            </div>

            {/* Compteur de résultats */}
            <div className="text-sm text-muted-foreground">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                {hasActiveFilters && (
                    <span className="ml-1 text-xs">
                        (sur {notifications.length} total)
                    </span>
                )}
            </div>

            {/* ===== TABLEAU ===== */}
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id}>
                                {hg.headers.map((h) => (
                                    <TableHead key={h.id}>
                                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {hasActiveFilters
                                        ? 'Aucune notification ne correspond aux filtres.'
                                        : 'Aucune notification trouvée.'
                                    }
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ===== PAGINATION ===== */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount() || 1}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Précédent
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Suivant
                    </Button>
                </div>
            </div>
        </div>
    );
}
