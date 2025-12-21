// components/articles/articles-table.tsx
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
    Tag,
    MapPin,
    Store,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type Article } from '@/stores/articlesStore';

// ============================================
// PROPS
// ============================================

interface ArticlesTableProps {
    articles: Article[];
    isLoading: boolean;
    onView: (article: Article) => void;
    onEdit: (article: Article) => void;
    onDelete: (article: Article) => void;
    onToggleActive: (article: Article) => void;
    onTogglePromotion?: (article: Article) => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Formate un montant en FCFA
 */
const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
    }).format(montant);
};

/**
 * Calcule le stock total d'un article
 */
const getTotalStock = (article: Article) => {
    return article.variations?.reduce((sum, v) => sum + v.stock, 0) || 0;
};

// ============================================
// DÉFINITION DES COLONNES
// ============================================

const createColumns = (
    onView: (article: Article) => void,
    onEdit: (article: Article) => void,
    onDelete: (article: Article) => void,
    onToggleActive: (article: Article) => void,
    onTogglePromotion?: (article: Article) => void
): ColumnDef<Article>[] => [
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
                        Article
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const article = row.original;

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 rounded-md">
                            <AvatarImage 
                                src={article.image_principale || undefined} 
                                alt={article.nom}
                                className="object-cover"
                            />
                            <AvatarFallback className="rounded-md">
                                {article.nom.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium">{article.nom}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                                {article.description || "Aucune description"}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "categories",
            header: "Catégorie",
            cell: ({ row }) => {
                const categorie = row.original.categories;

                if (!categorie) {
                    return (
                        <Badge variant="outline" className="text-xs">
                            Non classé
                        </Badge>
                    );
                }

                return (
                    <Badge variant="secondary" className="text-xs">
                        {categorie.nom}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "users",
            header: "Vendeur",
            cell: ({ row }) => {
                const user = row.original.users;

                if (!user) {
                    return (
                        <span className="text-xs text-muted-foreground italic">
                            Non défini
                        </span>
                    );
                }

                return (
                    <div className="flex items-center gap-2">
                        <Store className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{user.name}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "prix",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Prix
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const article = row.original;
                const prixOriginal = article.prix;
                const prixPromo = article.prix_promotion;
                const isPromo = article.is_promotion && prixPromo;

                return (
                    <div className="flex flex-col gap-1">
                        {isPromo ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-600">
                                        {formatMontant(prixPromo)}
                                    </span>
                                    <Badge variant="destructive" className="text-xs">
                                        -{article.pourcentage_reduction}%
                                    </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground line-through">
                                    {formatMontant(prixOriginal)}
                                </span>
                            </>
                        ) : (
                            <span className="font-medium">
                                {formatMontant(prixOriginal)}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "stock",
            header: "Stock",
            cell: ({ row }) => {
                const article = row.original;
                const totalStock = getTotalStock(article);
                const stockColor = totalStock === 0 
                    ? "text-red-600" 
                    : totalStock < 10 
                    ? "text-orange-600" 
                    : "text-green-600";

                return (
                    <div className="text-center">
                        <span className={`font-bold ${stockColor}`}>
                            {totalStock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                            unités
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "badges",
            header: "Badges",
            cell: ({ row }) => {
                const article = row.original;

                return (
                    <div className="flex flex-wrap gap-1">
                        {article.is_promotion && (
                            <Badge variant="default" className="text-xs">
                                <Tag className="mr-1 h-3 w-3" />
                                Promo
                            </Badge>
                        )}
                        {article.made_in_gabon && (
                            <Badge variant="secondary" className="text-xs">
                                <MapPin className="mr-1 h-3 w-3" />
                                Gabon
                            </Badge>
                        )}
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
                                Actif
                            </>
                        ) : (
                            <>
                                <XCircle className="mr-1 h-3 w-3" />
                                Inactif
                            </>
                        )}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Date création
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
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
                const article = row.original;

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
                                onClick={() => navigator.clipboard.writeText(article.id)}
                            >
                                Copier l'ID
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onView(article)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir les détails
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onEdit(article)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onToggleActive(article)}>
                                {article.is_active ? (
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

                            {onTogglePromotion && (
                                <DropdownMenuItem onClick={() => onTogglePromotion(article)}>
                                    {article.is_promotion ? (
                                        <>
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Retirer de la promo
                                        </>
                                    ) : (
                                        <>
                                            <Tag className="mr-2 h-4 w-4" />
                                            Mettre en promo
                                        </>
                                    )}
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() => onDelete(article)}
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

export function ArticlesTable({
    articles,
    isLoading,
    onView,
    onEdit,
    onDelete,
    onToggleActive,
    onTogglePromotion,
}: ArticlesTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "created_at", desc: true }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const columns = React.useMemo(
        () => createColumns(onView, onEdit, onDelete, onToggleActive, onTogglePromotion),
        [onView, onEdit, onDelete, onToggleActive, onTogglePromotion]
    );

    const table = useReactTable({
        data: articles,
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
                    placeholder="Rechercher un article..."
                    value={(table.getColumn("nom")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("nom")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />

                {/* Sélecteur de colonnes */}
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
                                    Aucun article trouvé.
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