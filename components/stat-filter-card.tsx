'use client'

import * as React from "react"
import { Check } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/app/lib/utils"

interface StatFilterCardProps {
  /** Identifiant du filtre (passé à onSelect). */
  filterKey: string
  /** Filtre actuellement actif sur la page parente. */
  activeFilter: string
  /** Notifie le parent qu'on clique sur cette carte. Le parent décide quoi faire (toggle, set, etc.). */
  onSelect: (filterKey: string) => void
  /** Petit label en haut (ex. "Total des utilisateurs"). */
  label: React.ReactNode
  /** Valeur principale affichée en gros. */
  value: React.ReactNode
  /** Couleur du chiffre principal (classes Tailwind, ex. "text-amber-600"). */
  valueClassName?: string
  /** Couleur du highlight quand la carte est active (classes Tailwind, ex. "ring-amber-500/40"). */
  activeRingClassName?: string
  /** Contenu auxiliaire (badge, sous-texte) sous la valeur. */
  footer?: React.ReactNode
  /** Désactive l'interactivité. */
  disabled?: boolean
}

/**
 * Carte statistique cliquable qui sert de filtre rapide sur la table d'une page.
 * - Clic sur la carte → notifie le parent via `onSelect(filterKey)`.
 * - État visuel actif (anneau + fond) quand `activeFilter === filterKey`.
 * - Le parent gère la logique de toggle / reset.
 */
export function StatFilterCard({
  filterKey,
  activeFilter,
  onSelect,
  label,
  value,
  valueClassName,
  activeRingClassName,
  footer,
  disabled,
}: StatFilterCardProps) {
  const isActive = activeFilter === filterKey
  const handleClick = () => {
    if (disabled) return
    onSelect(filterKey)
  }
  const handleKey = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onSelect(filterKey)
    }
  }

  return (
    <Card
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isActive}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={handleKey}
      className={cn(
        "relative cursor-pointer transition-all select-none",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive && "ring-2 ring-offset-2 ring-primary/50 border-primary/50 bg-primary/5",
        isActive && activeRingClassName,
        disabled && "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none"
      )}
    >
      {isActive && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-medium">
          <Check className="h-3 w-3" />
          Filtré
        </span>
      )}
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">{label}</CardDescription>
        <CardTitle className={cn("text-3xl font-bold", valueClassName)}>{value}</CardTitle>
      </CardHeader>
      {footer && <CardContent>{footer}</CardContent>}
    </Card>
  )
}
