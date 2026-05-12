// components/livraisons/livraisons-table.tsx
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
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    Truck,
    User,
    ShoppingBag,
    MapPin,
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
import { type Livraison, normalizeStatut } from '@/stores/livraisonsStore';

// ============================================
// PROPS
// ============================================

interface LivraisonsTableProps {
    livraisons: Livraison[];
    isLoading: boolean;
    onView: (livraison: Livraison) => void;
    onDelete: (livraison: Livraison) => void;
}

// ============================================
// HELPERS
// ============================================

const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
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
            return { label: 'En attente', variant: 'outline' as const, icon: Clock, className: 'text-amber-600 border-amber-300 bg-amber-50' };
        case 'Attribuée':
            return { label: 'Attribuée', variant: 'outline' as const, icon: Truck, className: 'text-blue-600 border-blue-300 bg-blue-50' };
        case 'En cours de livraison':
            return { label: 'En cours', variant: 'outline' as const, icon: Truck, className: 'text-orange-600 border-orange-300 bg-orange-50' };
        case 'Livrée':
            return { label: 'Livrée', variant: 'outline' as const, icon: CheckCircle, className: 'text-green-600 border-green-300 bg-green-50' };
        case 'Annulée':
            return { label: 'Annulée', variant: 'outline' as const, icon: XCircle, className: 'text-red-600 border-red-300 bg-red-50' };
        case 'Reportée':
            return { label: 'Reportée', variant: 'outline' as const, icon: Clock, className: 'text-gray-600 border-gray-300 bg-gray-50' };
        default:
            return { label: statut, variant: 'outline' as const, icon: Clock, className: 'text-muted-foreground' };
    }
};

// ============================================
// DÉFINITION DES COLONNES
// ============================================

const createColumns = (
    onView: (livraison: Livraison) => void,
    onDelete: (livraison: Livraison) => void,
): ColumnDef<Livraison>[] => [
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
                    aria-label="Sélectionner cette ligne"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            id: "client",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Client
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            accessorFn: (row) => row.users?.name ?? '',
            cell: ({ row }) => {
                const user = row.original.users;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium text-sm">{user?.name ?? 'Inconnu'}</span>
                            <span className="text-xs text-muted-foreground">{user?.phone ?? '—'}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            id: "commande",
            header: "Commande",
            accessorFn: (row) => row.commandes?.numero ?? '',
            cell: ({ row }) => {
                const commande = row.original.commandes;
                if (!commande) return <span className="text-xs text-muted-foreground">—</span>;
                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm">
                            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono font-semibold">#{commande.numero}</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-5">
                            {formatPrice(commande.prix)}
                        </span>
                    </div>
                );
            },
        },
        {
            id: "adresse",
            header: "Adresse",
            accessorFn: (row) => row.adresse,
            cell: ({ row }) => {
                const livraison = row.original;
                return (
                    <div className="flex items-start gap-1.5 max-w-[200px]">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-sm truncate">{livraison.adresse}</span>
                            <span className="text-xs text-muted-foreground">{livraison.ville}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "statut",
            header: "Statut",
            cell: ({ row }) => {
                const statut = row.getValue("statut") as string;
                const config = getStatutConfig(statut);
                const Icon = config.icon;
                return (
                    <Badge variant={config.variant} className={config.className}>
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "date_livraison",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Date prévue
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.getValue("date_livraison"))}
                </span>
            ),
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const livraison = row.original;
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
                                onClick={() => navigator.clipboard.writeText(livraison.id)}
                            >
                                Copier l'ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onView(livraison)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir les détails
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(livraison)}
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

export function LivraisonsTable({
    livraisons,
    isLoading,
    onView,
    onDelete,
}: LivraisonsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "date_livraison", desc: false }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const columns = React.useMemo(
        () => createColumns(onView, onDelete),
        [onView, onDelete]
    );

    const table = useReactTable({
        data: livraisons,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    return (
        <div className="w-full">
            {/* Barre de recherche et filtres */}
            <div className="flex items-center gap-4 py-4">
                <Input
                    placeholder="Rechercher un client..."
                    value={(table.getColumn("client")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("client")?.setFilterValue(event.target.value)
                    }
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
                            .filter((column) => column.getCanHide())
                            .map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                >
                                    {column.id}
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
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
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
                                    Aucune livraison trouvée.
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
