// components/users/users-table.tsx
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
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Shield,
    ShieldCheck,
    Wallet,
    EyeIcon,
    BadgeCheck,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/stores/usersStore";

type CertificationFilter = "all" | "certified" | "not_certified";

// ============================================
// HELPERS
// ============================================

const getRoleBadge = (role: User["role"]) => {
    const map = {
        Administrateur: { label: "Admin", variant: "default" as const },
        Boutique: { label: "Boutique", variant: "secondary" as const },
        Client: { label: "Client", variant: "outline" as const },
        Livreur: { label: "Livreur", variant: "outline" as const },
    };

    const config = map[role];

    return <Badge variant={config.variant}>{config.label}</Badge>;
};

const formatMontant = (montant: number) =>
    new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "XAF",
        minimumFractionDigits: 0,
    }).format(montant);

const getInitials = (name: string) =>
    name
        .split(" ")
        .map(w => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

// ============================================
// COLUMNS
// ============================================

const createColumns = (
    onEdit: (u: User) => void,
    onDelete: (u: User) => void,
    onToggleActive: (u: User) => void,
    onToggleVerified?: (u: User) => void,
    onUpdateSolde?: (u: User) => void,
    onToggleCertified?: (u: User) => void
): ColumnDef<User>[] => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={v => row.toggleSelected(!!v)}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: "Utilisateur",
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.url_logo ?? undefined} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                    </div>
                );
            },
            filterFn: (row, _, value) => {
                const user = row.original;
                return (
                    user.name.toLowerCase().includes(value.toLowerCase()) ||
                    user.email.toLowerCase().includes(value.toLowerCase())
                );
            },
        },
        {
            accessorKey: "role",
            header: "Rôle",
            cell: ({ row }) => getRoleBadge(row.original.role),
        },
        {
            accessorKey: "solde",
            header: "Solde",
            cell: ({ row }) => (
                <span className="font-medium">
                    {formatMontant(row.original.solde)}
                </span>
            ),
        },
        {
            accessorKey: "is_verified",
            header: "Vérifié",
            cell: ({ row }) =>
                row.original.is_verified ? (
                    <Badge><ShieldCheck className="mr-1 h-3 w-3" /> Vérifié</Badge>
                ) : (
                    <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" /> Non</Badge>
                ),
        },
        {
            accessorKey: "is_active",
            header: "Statut",
            cell: ({ row }) =>
                row.original.is_active ? (
                    <Badge><CheckCircle className="mr-1 h-3 w-3" /> Actif</Badge>
                ) : (
                    <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" /> Inactif</Badge>
                ),
        },
        {
            accessorKey: "is_certified",
            header: "Certifiée",
            cell: ({ row }) => {
                const user = row.original;
                if (user.role !== "Boutique") {
                    return <span className="text-muted-foreground">—</span>;
                }
                return user.is_certified ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">
                        <BadgeCheck className="mr-1 h-3 w-3" /> Certifiée
                    </Badge>
                ) : (
                    <Badge variant="secondary">Non certifiée</Badge>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                                <EyeIcon className="mr-2 h-4 w-4" /> Voir
                            </DropdownMenuItem>
                            {onToggleCertified && user.role === "Boutique" && (
                                <DropdownMenuItem onClick={() => onToggleCertified(user)}>
                                    <BadgeCheck className="mr-2 h-4 w-4" />
                                    {user.is_certified ? "Retirer la certification" : "Certifier la boutique"}
                                </DropdownMenuItem>
                            )}
                            {/* {onUpdateSolde && (
                            <DropdownMenuItem onClick={() => onUpdateSolde(user)}>
                                <Wallet className="mr-2 h-4 w-4" /> Solde
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onToggleActive(user)}>
                            {user.is_active ? "Désactiver" : "Activer"}
                        </DropdownMenuItem>
                        {onToggleVerified && (
                            <DropdownMenuItem onClick={() => onToggleVerified(user)}>
                                {user.is_verified ? "Retirer vérification" : "Vérifier"}
                            </DropdownMenuItem>
                        )} */}
                            {/* <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(user)}
                                className="text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem> */}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

// ============================================
// COMPONENT
// ============================================

export function UsersTable(props: any) {
    const {
        users,
        isLoading,
        onEdit,
        onDelete,
        onToggleActive,
        onToggleVerified,
        onUpdateSolde,
        onToggleCertified,
    } = props;

    // console.log("[UsersTable] users:", users.length);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [certificationFilter, setCertificationFilter] =
        React.useState<CertificationFilter>("all");

    const columns = React.useMemo(
        () => createColumns(onEdit, onDelete, onToggleActive, onToggleVerified, onUpdateSolde, onToggleCertified),
        [onEdit, onDelete, onToggleActive, onToggleVerified, onUpdateSolde, onToggleCertified]
    );

    const filteredUsers = React.useMemo(() => {
        if (certificationFilter === "all") return users;
        // Les filtres "certified"/"not_certified" ne concernent que les boutiques
        return (users as User[]).filter((u) => {
            if (u.role !== "Boutique") return false;
            return certificationFilter === "certified"
                ? u.is_certified
                : !u.is_certified;
        });
    }, [users, certificationFilter]);

    const table = useReactTable({
        data: filteredUsers,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <Input
                    placeholder="Rechercher nom ou email..."
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    onChange={e =>
                        table.getColumn("name")?.setFilterValue(e.target.value)
                    }
                    className="max-w-sm"
                />

                <Select
                    value={certificationFilter}
                    onValueChange={(v) => setCertificationFilter(v as CertificationFilter)}
                >
                    <SelectTrigger className="w-full sm:w-[260px]">
                        <BadgeCheck className="mr-2 h-4 w-4 text-emerald-600" />
                        <SelectValue placeholder="Filtrer la certification" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les utilisateurs</SelectItem>
                        <SelectItem value="certified">Boutiques certifiées uniquement</SelectItem>
                        <SelectItem value="not_certified">Boutiques non certifiées</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map(hg => (
                        <TableRow key={hg.id}>
                            {hg.headers.map(h => (
                                <TableHead key={h.id}>
                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center">
                                Chargement...
                            </TableCell>
                        </TableRow>
                    ) : table.getRowModel().rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                                Aucun utilisateur ne correspond aux filtres.
                            </TableCell>
                        </TableRow>
                    ) : (
                        table.getRowModel().rows.map(row => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

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
