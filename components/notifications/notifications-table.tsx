// components/notifications/notifications-table.tsx
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
    CheckCheck,
    Eye,
    EyeOff,
    Bell,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { type Notification, type NotificationType } from '@/stores/notificationsStore';

// ============================================
// PROPS
// ============================================

interface NotificationsTableProps {
    notifications: Notification[];
    isLoading: boolean;
    onMarkAsRead: (notification: Notification) => void;
    onDelete: (notification: Notification) => void;
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

const TYPE_CONFIG: Record<NotificationType, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
    commande:     { label: 'Commande',     variant: 'default',     color: 'text-blue-600' },
    livraison:    { label: 'Livraison',    variant: 'outline',     color: 'text-green-600' },
    message:      { label: 'Message',      variant: 'secondary',   color: 'text-purple-600' },
    promotion:    { label: 'Promotion',    variant: 'default',     color: 'text-orange-600' },
    alerte_stock: { label: 'Stock',        variant: 'destructive', color: 'text-red-600' },
    avis:         { label: 'Avis',         variant: 'secondary',   color: 'text-yellow-600' },
    systeme:      { label: 'Système',      variant: 'outline',     color: 'text-gray-600' },
};

// ============================================
// COLONNES
// ============================================

const createColumns = (
    onMarkAsRead: (n: Notification) => void,
    onDelete: (n: Notification) => void,
): ColumnDef<Notification>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Tout sélectionner"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Sélectionner"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
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
            const notification = row.original;
            return (
                <div className="flex items-start gap-3 max-w-[320px]">
                    <div className={`mt-0.5 shrink-0 ${TYPE_CONFIG[notification.type]?.color ?? 'text-gray-500'}`}>
                        <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className={`font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.titre}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                        </span>
                        {notification.lien && (
                            <a
                                href={notification.lien}
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
            return (
                <Badge variant={config?.variant ?? 'secondary'}>
                    {config?.label ?? type}
                </Badge>
            );
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
        accessorKey: "is_read",
        header: "Statut",
        cell: ({ row }) => {
            const isRead = row.getValue("is_read") as boolean;
            return (
                <Badge variant={isRead ? 'secondary' : 'default'}>
                    {isRead ? (
                        <><EyeOff className="mr-1 h-3 w-3" />Lue</>
                    ) : (
                        <><Eye className="mr-1 h-3 w-3" />Non lue</>
                    )}
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
            const notification = row.original;
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
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(notification.id)}
                        >
                            Copier l'ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!notification.is_read && (
                            <DropdownMenuItem onClick={() => onMarkAsRead(notification)}>
                                <CheckCheck className="mr-2 h-4 w-4" />
                                Marquer comme lue
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete(notification)}
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

export function NotificationsTable({
    notifications,
    isLoading,
    onMarkAsRead,
    onDelete,
}: NotificationsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "created_at", desc: true }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const columns = React.useMemo(
        () => createColumns(onMarkAsRead, onDelete),
        [onMarkAsRead, onDelete]
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
        onRowSelectionChange: setRowSelection,
        state: { sorting, columnFilters, columnVisibility, rowSelection },
    });

    return (
        <div className="w-full">
            {/* Barre de recherche et filtres */}
            <div className="flex items-center gap-4 py-4">
                <Input
                    placeholder="Rechercher une notification..."
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

            {/* Tableau */}
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
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
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={!row.original.is_read ? "bg-muted/30" : ""}
                                >
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

            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="text-muted-foreground flex-1 text-sm">
                    {table.getFilteredSelectedRowModel().rows.length} sur{" "}
                    {table.getFilteredRowModel().rows.length} ligne(s) sélectionnée(s).
                </div>
                <div className="space-x-2">
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
