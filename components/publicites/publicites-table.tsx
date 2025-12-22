// components/publicites/publicites-table.tsx
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
    Calendar,
    ExternalLink,
    Clock,
    AlertCircle,
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
import { type Publicite } from '@/stores/publicitesStore';

// ============================================
// PROPS
// ============================================

interface PublicitesTableProps {
    publicites: Publicite[];
    isLoading: boolean;
    onView: (publicite: Publicite) => void;
    onEdit: (publicite: Publicite) => void;
    onDelete: (publicite: Publicite) => void;
    onToggleActive: (publicite: Publicite) => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Formate une date
 */
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Calcule le nombre de jours restants
 */
const getDaysRemaining = (endDate: string): number => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Retourne le statut de la publicité
 */
const getPubliciteStatus = (publicite: Publicite) => {
    const now = new Date();
    const start = new Date(publicite.date_start);
    const end = new Date(publicite.date_end);

    if (!publicite.is_actif) {
        return { label: 'Inactive', variant: 'secondary' as const, icon: XCircle };
    }

    if (now < start) {
        return { label: 'À venir', variant: 'outline' as const, icon: Clock };
    }

    if (now >= start && now <= end) {
        return { label: 'En cours', variant: 'default' as const, icon: CheckCircle };
    }

    return { label: 'Expirée', variant: 'destructive' as const, icon: AlertCircle };
};

/**
 * Détecte le type de média
 */
const getMediaType = (url: string): 'image' | 'video' | 'gif' => {
    const lower = url.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
        return 'video';
    }
    if (lower.endsWith('.gif')) {
        return 'gif';
    }
    return 'image';
};

// ============================================
// DÉFINITION DES COLONNES
// ============================================

const createColumns = (
    onView: (publicite: Publicite) => void,
    onEdit: (publicite: Publicite) => void,
    onDelete: (publicite: Publicite) => void,
    onToggleActive: (publicite: Publicite) => void
): ColumnDef<Publicite>[] => [
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
            accessorKey: "titre",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Campagne
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const publicite = row.original;
                const mediaType = getMediaType(publicite.url_image);

                return (
                    <div className="flex items-center gap-3">
                        <div className="relative h-16 w-24 rounded-md overflow-hidden bg-muted">
                            {mediaType === 'video' ? (
                                <video
                                    src={publicite.url_image}
                                    className="h-full w-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                />
                            ) : (
                                <img
                                    src={publicite.url_image}
                                    alt={publicite.titre}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/100x60?text=Media';
                                    }}
                                />
                            )}
                            {mediaType === 'gif' && (
                                <Badge className="absolute bottom-1 right-1 text-xs">GIF</Badge>
                            )}
                            {mediaType === 'video' && (
                                <Badge className="absolute bottom-1 right-1 text-xs">VIDEO</Badge>
                            )}
                        </div>
                        <div className="flex flex-col max-w-[200px]">
                            <span className="font-medium truncate">{publicite.titre}</span>
                            <span className="text-xs text-muted-foreground truncate">
                                {publicite.description}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "date_start",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Début
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const date = formatDate(row.getValue("date_start"));
                return (
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {date}
                    </div>
                );
            },
        },
        {
            accessorKey: "date_end",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Fin
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const publicite = row.original;
                const date = formatDate(publicite.date_end);
                const daysRemaining = getDaysRemaining(publicite.date_end);
                const isEnCours = getPubliciteStatus(publicite).label === 'En cours';

                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {date}
                        </div>
                        {isEnCours && daysRemaining >= 0 && (
                            <span className="text-xs text-muted-foreground">
                                {daysRemaining === 0 
                                    ? "Dernière jour" 
                                    : `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
                                }
                            </span>
                        )}
                    </div>
                );
            },
        },
        // {
        //     accessorKey: "lien",
        //     header: "Lien",
        //     cell: ({ row }) => {
        //         const lien = row.getValue("lien") as string;

        //         return (
        //             <a
        //                 href={lien}
        //                 target="_blank"
        //                 rel="noopener noreferrer"
        //                 className="flex items-center gap-2 text-sm text-blue-600 hover:underline max-w-[150px] truncate"
        //             >
        //                 <ExternalLink className="h-3 w-3" />
        //                 <span className="truncate">{new URL(lien).hostname}</span>
        //             </a>
        //         );
        //     },
        // },
        {
            accessorKey: "status",
            header: "Statut",
            cell: ({ row }) => {
                const publicite = row.original;
                const status = getPubliciteStatus(publicite);
                const Icon = status.icon;

                return (
                    <Badge variant={status.variant}>
                        <Icon className="mr-1 h-3 w-3" />
                        {status.label}
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
                const date = formatDate(row.getValue("created_at"));
                return (
                    <div className="text-sm text-muted-foreground">
                        {date}
                    </div>
                );
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const publicite = row.original;

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
                                onClick={() => navigator.clipboard.writeText(publicite.id)}
                            >
                                Copier l'ID
                            </DropdownMenuItem>

                            {/* <DropdownMenuItem
                                onClick={() => window.open(publicite.lien, '_blank')}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ouvrir le lien
                            </DropdownMenuItem> */}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onView(publicite)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir les détails
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onEdit(publicite)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onToggleActive(publicite)}>
                                {publicite.is_actif ? (
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
                                onClick={() => onDelete(publicite)}
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

export function PublicitesTable({
    publicites,
    isLoading,
    onView,
    onEdit,
    onDelete,
    onToggleActive,
}: PublicitesTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "date_start", desc: true }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const columns = React.useMemo(
        () => createColumns(onView, onEdit, onDelete, onToggleActive),
        [onView, onEdit, onDelete, onToggleActive]
    );

    const table = useReactTable({
        data: publicites,
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
                    placeholder="Rechercher une campagne..."
                    value={(table.getColumn("titre")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("titre")?.setFilterValue(event.target.value)
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
                                    Aucune publicité trouvée.
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