// components/categories/categories-table.tsx
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
    Eye,
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
import { type Categorie } from '@/stores/categoriesStore';

// ============================================
// PROPS
// ============================================

interface CategoriesTableProps {
    categories: Categorie[];
    isLoading: boolean;
    onEdit: (categorie: Categorie) => void;
    onDelete: (categorie: Categorie) => void;
    onToggleActive: (categorie: Categorie) => void;
}

// ============================================
// DÉFINITION DES COLONNES
// ============================================

const createColumns = (
    onEdit: (categorie: Categorie) => void,
    onDelete: (categorie: Categorie) => void,
    onToggleActive: (categorie: Categorie) => void
): ColumnDef<Categorie>[] => [
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
            accessorKey: "nom",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Nom
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const categorie = row.original;
                const niveau = categorie.parent_id ? 1 : 0; // Simplification, vous pouvez calculer le vrai niveau

                return (
                    <div className="flex items-center gap-2">
                        {niveau > 0 && (
                            <span className="text-muted-foreground">
                                {'└─ '}
                            </span>
                        )}
                        <span className="font-medium">{categorie.nom}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "slug",
            header: "Slug",
            cell: ({ row }) => (
                <code className="text-xs bg-muted px-2 py-1 rounded">
                    {row.getValue("slug")}
                </code>
            ),
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => {
                const description = row.getValue("description") as string | null;
                return (
                    <div className="max-w-[200px] truncate">
                        {description || (
                            <span className="text-muted-foreground italic">
                                Aucune description
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "parent_id",
            header: "Parent",
            cell: ({ row }) => {
                const categorie = row.original;

                if (!categorie.parent) {
                    return (
                        <Badge variant="outline">
                            Racine
                        </Badge>
                    );
                }

                return (
                    <div className="text-sm text-muted-foreground">
                        {categorie.parent.nom}
                    </div>
                );
            },
        },
        {
            accessorKey: "is_active",
            header: "Statut",
            cell: ({ row }) => {
                const isActive = row.getValue("is_active") as boolean;

                return (
                    <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? (
                            <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Active
                            </>
                        ) : (
                            <>
                                <XCircle className="mr-1 h-3 w-3" />
                                Inactive
                            </>
                        )}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "ordre",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Ordre
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                return <div className="text-center">{row.getValue("ordre")}</div>;
            },
        },
        {
            accessorKey: "_count",
            header: "Articles",
            cell: ({ row }) => {
                const count = row.original._count?.articles || 0;
                return (
                    <div className="text-center">
                        <Badge variant="outline">{count}</Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: "Date de création",
            cell: ({ row }) => {
                const date = new Date(row.getValue("created_at"));
                return (
                    <div className="text-sm text-muted-foreground">
                        {date.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </div>
                );
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const categorie = row.original;

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
                                onClick={() => navigator.clipboard.writeText(categorie.id)}
                            >
                                Copier l'ID
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onEdit(categorie)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onToggleActive(categorie)}>
                                {categorie.is_active ? (
                                    <>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Désactiver
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Activer
                                    </>
                                )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() => onDelete(categorie)}
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

export function CategoriesTable({
    categories,
    isLoading,
    onEdit,
    onDelete,
    onToggleActive,
}: CategoriesTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const columns = React.useMemo(
        () => createColumns(onEdit, onDelete, onToggleActive),
        [onEdit, onDelete, onToggleActive]
    );

    const table = useReactTable({
        data: categories,
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
            <div className="flex items-center py-4">
                <Input
                    placeholder="Rechercher une catégorie..."
                    value={(table.getColumn("nom")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("nom")?.setFilterValue(event.target.value)
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
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Tableau */}
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    <div className="flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Aucune catégorie trouvée.
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