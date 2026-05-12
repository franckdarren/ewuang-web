// components/commandes/commandes-table.tsx
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
    RefreshCw,
    Truck,
    PackageCheck,
    Package,
    User,
    ShoppingBag,
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
import { type Commande } from '@/stores/types/common';

// ============================================
// PROPS
// ============================================

interface CommandesTableProps {
    commandes: Commande[];
    isLoading: boolean;
    onView: (commande: Commande) => void;
    onDelete: (commande: Commande) => void;
    onUpdateStatut: (commande: Commande, statut: string) => void;
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
    });
};

const formatMontant = (montant: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(montant);

const getStatutConfig = (statut: string) => {
    const s = statut?.toLowerCase() ?? '';

    if (s.includes('attente')) {
        return {
            label: 'En attente',
            variant: 'outline' as const,
            icon: Clock,
            className: 'text-amber-600 border-amber-300 bg-amber-50',
        };
    }
    if (s.includes('préparation') || s.includes('preparation')) {
        return {
            label: 'En préparation',
            variant: 'outline' as const,
            icon: Package,
            className: 'text-blue-600 border-blue-300 bg-blue-50',
        };
    }
    if (s.includes('prête') || s.includes('prete')) {
        return {
            label: 'Prête',
            variant: 'outline' as const,
            icon: PackageCheck,
            className: 'text-purple-600 border-purple-300 bg-purple-50',
        };
    }
    if (s.includes('cours')) {
        return {
            label: 'En livraison',
            variant: 'outline' as const,
            icon: Truck,
            className: 'text-indigo-600 border-indigo-300 bg-indigo-50',
        };
    }
    if (s.includes('livr') && !s.includes('livraison')) {
        return {
            label: 'Livrée',
            variant: 'outline' as const,
            icon: CheckCircle,
            className: 'text-green-600 border-green-300 bg-green-50',
        };
    }
    if (s.includes('annul')) {
        return {
            label: 'Annulée',
            variant: 'outline' as const,
            icon: XCircle,
            className: 'text-red-600 border-red-300 bg-red-50',
        };
    }
    if (s.includes('rembours')) {
        return {
            label: 'Remboursée',
            variant: 'outline' as const,
            icon: RefreshCw,
            className: 'text-teal-600 border-teal-300 bg-teal-50',
        };
    }
    return {
        label: statut ?? '—',
        variant: 'outline' as const,
        icon: Clock,
        className: '',
    };
};

// Statuts disponibles pour la mise à jour
const STATUTS_DISPONIBLES = [
    'En attente',
    'En préparation',
    'Prête pour livraison',
    'En cours de livraison',
    'Livrée',
    'Annulée',
    'Remboursée',
];

// ============================================
// DÉFINITION DES COLONNES
// ============================================

const createColumns = (
    onView: (commande: Commande) => void,
    onDelete: (commande: Commande) => void,
    onUpdateStatut: (commande: Commande, statut: string) => void,
): ColumnDef<Commande>[] => [
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
        accessorKey: "numero",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                N° Commande
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const commande = row.original;
            return (
                <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono font-semibold text-sm">
                        #{commande.numero}
                    </span>
                </div>
            );
        },
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
        accessorFn: (row) => (row as any).users?.name ?? '',
        cell: ({ row }) => {
            const user = (row.original as any).users;
            return (
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">
                            {user?.name ?? 'Client inconnu'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {user?.email ?? '—'}
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "prix",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Montant
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <span className="font-semibold text-sm">
                {formatMontant(row.getValue("prix"))}
            </span>
        ),
    },
    {
        id: "articles",
        header: "Articles",
        cell: ({ row }) => {
            const articles = (row.original as any).commande_articles ?? [];
            const count = articles.length;
            return (
                <span className="text-sm text-muted-foreground">
                    {count} article{count > 1 ? 's' : ''}
                </span>
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
        accessorKey: "isLivrable",
        header: "Livraison",
        cell: ({ row }) => {
            const isLivrable = row.getValue("isLivrable") as boolean;
            return (
                <Badge variant={isLivrable ? "default" : "secondary"} className="text-xs">
                    {isLivrable ? (
                        <>
                            <Truck className="mr-1 h-3 w-3" />
                            À livrer
                        </>
                    ) : "Retrait"}
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
            <span className="text-sm text-muted-foreground">
                {formatDate(row.getValue("created_at"))}
            </span>
        ),
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const commande = row.original;
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
                            onClick={() => navigator.clipboard.writeText(commande.id)}
                        >
                            Copier l'ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onView(commande)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Changer le statut
                        </DropdownMenuLabel>
                        {STATUTS_DISPONIBLES.map((statut) => {
                            const config = getStatutConfig(statut);
                            const Icon = config.icon;
                            return (
                                <DropdownMenuItem
                                    key={statut}
                                    onClick={() => onUpdateStatut(commande, statut)}
                                >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {statut}
                                </DropdownMenuItem>
                            );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete(commande)}
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

export function CommandesTable({
    commandes,
    isLoading,
    onView,
    onDelete,
    onUpdateStatut,
}: CommandesTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "created_at", desc: true }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const columns = React.useMemo(
        () => createColumns(onView, onDelete, onUpdateStatut),
        [onView, onDelete, onUpdateStatut]
    );

    const table = useReactTable({
        data: commandes,
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
                    placeholder="Rechercher par n° de commande..."
                    value={(table.getColumn("numero")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("numero")?.setFilterValue(event.target.value)
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
                                    className="cursor-pointer"
                                    onClick={() => onView(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            onClick={(e) => {
                                                // Empêche le clic sur la ligne d'interférer avec les actions
                                                if (cell.column.id === 'select' || cell.column.id === 'actions') {
                                                    e.stopPropagation();
                                                }
                                            }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Aucune commande trouvée.
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
