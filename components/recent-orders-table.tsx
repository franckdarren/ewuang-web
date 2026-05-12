'use client'

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface RecentOrder {
  id: string
  numero: string
  prix: number
  statut: string
  created_at: string
  users: { name: string; email: string } | null
}

interface RecentOrdersTableProps {
  orders?: RecentOrder[]
}

const statutConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "En attente": { label: "En attente", variant: "outline" },
  "En préparation": { label: "En préparation", variant: "secondary" },
  "Prête pour livraison": { label: "Prête livraison", variant: "secondary" },
  "En cours de livraison": { label: "En livraison", variant: "default" },
  "Livrée": { label: "Livrée", variant: "default" },
  "Annulée": { label: "Annulée", variant: "destructive" },
  "Remboursée": { label: "Remboursée", variant: "destructive" },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-GA", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const list = orders ?? [];
  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>Commandes récentes</CardTitle>
        <CardDescription>
          Les 10 dernières commandes passées sur la plateforme
        </CardDescription>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            Aucune commande pour le moment
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((order) => {
                const config = statutConfig[order.statut] ?? { label: order.statut, variant: "outline" as const }
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.numero}</TableCell>
                    <TableCell>
                      <div className="font-medium">{order.users?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{order.users?.email ?? ""}</div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.prix)}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
