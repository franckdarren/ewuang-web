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
    X,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
        case 'Validé':
            return { label: 'Validé', variant: 'default' as const, icon: CheckCircle2, className: 'bg-green-600 hover:bg-green-700 text-white border-transparent' };
        case 'Echoué':
            return { label: 'Échoué', variant: 'default' as const, icon: XCircle, className: 'bg-red-600 hover:bg-red-700 text-white border-transparent' };
        case 'En attente':
            return { label: 'En attente', variant: 'default' as const, icon: Clock, className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent' };
        case 'Remboursée':
            return { label: 'Remboursée', variant: 'default' as const, icon: RefreshCcw, className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent' };
        default:
            return { label: statut ?? 'Inconnu', variant: 'default' as const, icon: Clock, className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent' };
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
            const isValide = statut === 'Validé';
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

const STATUT_OPTIONS: PaiementStatut[] = ['Validé', 'En attente', 'Echoué', 'Remboursée'];
const METHODE_OPTIONS: { value: string; label: string }[] = [
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'carte', label: 'Carte bancaire' },
    { value: 'especes', label: 'Espèces' },
];

const ALL_VALUE = '__all__';

export function TransactionsTable({ transactions, isLoading, onView }: TransactionsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "created_at", desc: true }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    // ===== Filtres =====
    const [search, setSearch] = React.useState("");
    const [statutFilter, setStatutFilter] = React.useState<string>(ALL_VALUE);
    const [methodeFilter, setMethodeFilter] = React.useState<string>(ALL_VALUE);
    const [dateFrom, setDateFrom] = React.useState<string>("");
    const [dateTo, setDateTo] = React.useState<string>("");

    const hasActiveFilters =
        search.trim() !== "" ||
        statutFilter !== ALL_VALUE ||
        methodeFilter !== ALL_VALUE ||
        dateFrom !== "" ||
        dateTo !== "";

    const resetFilters = () => {
        setSearch("");
        setStatutFilter(ALL_VALUE);
        setMethodeFilter(ALL_VALUE);
        setDateFrom("");
        setDateTo("");
    };

    // ===== Filtrage côté client =====
    const filteredTransactions = React.useMemo(() => {
        const searchLower = search.trim().toLowerCase();
        const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
        const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

        return transactions.filter((t) => {
            if (statutFilter !== ALL_VALUE && t.statut !== statutFilter) return false;
            if (methodeFilter !== ALL_VALUE && t.methode !== methodeFilter) return false;

            if (fromTs !== null || toTs !== null) {
                const ts = new Date(t.created_at).getTime();
                if (fromTs !== null && ts < fromTs) return false;
                if (toTs !== null && ts > toTs) return false;
            }

            if (searchLower) {
                const inRef = t.reference?.toLowerCase().includes(searchLower);
                const inTxId = t.transaction_id?.toLowerCase().includes(searchLower);
                const inName = t.users?.name.toLowerCase().includes(searchLower);
                const inEmail = t.users?.email.toLowerCase().includes(searchLower);
                if (!inRef && !inTxId && !inName && !inEmail) return false;
            }

            return true;
        });
    }, [transactions, search, statutFilter, methodeFilter, dateFrom, dateTo]);

    const columns = React.useMemo(() => createColumns(onView), [onView]);

    const table = useReactTable({
        data: filteredTransactions,
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
            <div className="flex flex-col gap-3 py-4 lg:flex-row lg:flex-wrap lg:items-end">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="tx-search" className="text-xs text-muted-foreground">
                        Recherche
                    </Label>
                    <Input
                        id="tx-search"
                        placeholder="Référence, ID, client, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 w-full lg:w-[260px]"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <Label htmlFor="tx-statut" className="text-xs text-muted-foreground">
                        Statut
                    </Label>
                    <Select value={statutFilter} onValueChange={setStatutFilter}>
                        <SelectTrigger id="tx-statut" size="sm" className="w-full lg:w-[170px]">
                            <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_VALUE}>Tous les statuts</SelectItem>
                            {STATUT_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s === 'Echoué' ? 'Échoué' : s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1">
                    <Label htmlFor="tx-methode" className="text-xs text-muted-foreground">
                        Méthode
                    </Label>
                    <Select value={methodeFilter} onValueChange={setMethodeFilter}>
                        <SelectTrigger id="tx-methode" size="sm" className="w-full lg:w-[180px]">
                            <SelectValue placeholder="Toutes les méthodes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_VALUE}>Toutes les méthodes</SelectItem>
                            {METHODE_OPTIONS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1">
                    <Label htmlFor="tx-date-from" className="text-xs text-muted-foreground">
                        Du
                    </Label>
                    <Input
                        id="tx-date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        max={dateTo || undefined}
                        className="h-9 w-full lg:w-[150px]"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <Label htmlFor="tx-date-to" className="text-xs text-muted-foreground">
                        Au
                    </Label>
                    <Input
                        id="tx-date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={dateFrom || undefined}
                        className="h-9 w-full lg:w-[150px]"
                    />
                </div>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="h-9 text-muted-foreground"
                    >
                        <X className="mr-1 h-4 w-4" />
                        Réinitialiser
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 lg:ml-auto">
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
            <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-end">
                <div className="text-muted-foreground text-sm sm:flex-1">
                    {table.getFilteredSelectedRowModel().rows.length} sur{" "}
                    {table.getFilteredRowModel().rows.length} ligne(s) sélectionnée(s).
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
