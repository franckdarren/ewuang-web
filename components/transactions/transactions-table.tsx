// components/transactions/transactions-table.tsx
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
    Eye,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCcw,
    CreditCard,
    Smartphone,
    Banknote,
    Copy,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type Transaction, type PaiementStatut } from '@/stores/transactionsStore';

// ============================================
// PROPS
// ============================================

interface TransactionsTableProps {
    transactions: Transaction[];
    isLoading: boolean;
    onView: (transaction: Transaction) => void;
}

// ============================================
// HELPERS
// ============================================

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
    }).format(montant);
};

const getStatutConfig = (statut: PaiementStatut) => {
    switch (statut) {
        case 'valide':
            return { label: 'Validé', variant: 'default' as const, icon: CheckCircle2, className: 'bg-green-600 hover:bg-green-700' };
        case 'en_attente':
            return { label: 'En attente', variant: 'secondary' as const, icon: Clock, className: '' };
        case 'echoue':
            return { label: 'Échoué', variant: 'destructive' as const, icon: XCircle, className: '' };
        case 'rembourse':
            return { label: 'Remboursé', variant: 'outline' as const, icon: RefreshCcw, className: 'text-orange-600 border-orange-600' };
    }
};

const getMethodeConfig = (methode: string) => {
    switch (methode) {
        case 'carte':
            return { label: 'Carte bancaire', icon: CreditCard };
        case 'mobile_money':
            return { label: 'Mobile Money', icon: Smartphone };
        case 'especes':
            return { label: 'Espèces', icon: Banknote };
        default:
            return { label: methode, icon: CreditCard };
    }
};

const getUserInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// ============================================
// DÉFINITION DES COLONNES
// ============================================

const createColumns = (
    onView: (transaction: Transaction) => void,
): ColumnDef<Transaction>[] => [
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
        accessorKey: "reference",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Référence
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const transaction = row.original;
            return (
                <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-medium">{transaction.reference}</span>
                    {transaction.transaction_id && (
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                            {transaction.transaction_id}
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "users",
        header: "Client",
        cell: ({ row }) => {
            const user = row.original.users;
            if (!user) return <span className="text-muted-foreground text-sm">—</span>;
            return (
                <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10">
                            {getUserInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "montant",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Montant
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const statut = row.original.statut;
            const montant = row.getValue("montant") as number;
            const isValide = statut === 'valide';
            return (
                <span className={`font-semibold text-sm ${isValide ? 'text-green-600' : ''}`}>
                    {formatMontant(montant)}
                </span>
            );
        },
    },
    {
        accessorKey: "methode",
        header: "Méthode",
        cell: ({ row }) => {
            const methode = row.getValue("methode") as string;
            const config = getMethodeConfig(methode);
            const Icon = config.icon;
            return (
                <div className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{config.label}</span>
                </div>
            );
        },
    },
    {
        accessorKey: "statut",
        header: "Statut",
        cell: ({ row }) => {
            const statut = row.getValue("statut") as PaiementStatut;
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
        accessorKey: "commandes",
        header: "Commandes",
        cell: ({ row }) => {
            const commandes = row.original.commandes;
            if (!commandes?.length) return <span className="text-muted-foreground text-sm">—</span>;
            return (
                <span className="text-sm text-muted-foreground">
                    {commandes.length} commande{commandes.length > 1 ? 's' : ''}
                </span>
            );
        },
        enableSorting: false,
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
            const transaction = row.original;
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
                            onClick={() => navigator.clipboard.writeText(transaction.reference)}
                        >
                            <Copy className="mr-2 h-4 w-4" />
                            Copier la référence
                        </DropdownMenuItem>

                        {transaction.transaction_id && (
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(transaction.transaction_id!)}
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                Copier l&apos;ID transaction
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => onView(transaction)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir les détails
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

export function TransactionsTable({ transactions, isLoading, onView }: TransactionsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "created_at", desc: true }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const columns = React.useMemo(() => createColumns(onView), [onView]);

    const table = useReactTable({
        data: transactions,
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
                    placeholder="Rechercher par référence, client..."
                    value={(table.getColumn("reference")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("reference")?.setFilterValue(event.target.value)
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
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                                    Aucune transaction trouvée.
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
