// components/notifications/admin-notifications-table.tsx
'use client';

import * as React from "react";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table";
import {
    ArrowUpDown,
    ChevronDown,
    MoreHorizontal,
    Trash2,
    Bell,
    ExternalLink,
    Pencil,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

    const columns = React.useMemo(
        () => createColumns(onEdit, onResend, onDelete),
        [onEdit, onResend, onDelete]
    );

    const table = useReactTable({
        data: notifications,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: { sorting, columnFilters, columnVisibility },
    });

    return (
        <div className="w-full">
            <div className="flex items-center gap-4 py-4">
                <Input
                    placeholder="Rechercher par titre..."
                    value={(table.getColumn("titre")?.getFilterValue() as string) ?? ""}
                    onChange={(e) => table.getColumn("titre")?.setFilterValue(e.target.value)}
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            Colonnes <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((col) => col.getCanHide())
                            .map((col) => (
                                <DropdownMenuCheckboxItem
                                    key={col.id}
                                    className="capitalize"
                                    checked={col.getIsVisible()}
                                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                                >
                                    {col.id}
                                </DropdownMenuCheckboxItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

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
                                    Aucune notification trouvée.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-end">
                <div className="text-muted-foreground text-sm sm:flex-1">
                    {table.getFilteredRowModel().rows.length} notification(s)
                </div>
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
