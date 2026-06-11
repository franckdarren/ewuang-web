'use client'

import * as React from "react"
import { IconCalendar } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type PeriodPreset = "today" | "week" | "month" | "year" | "all" | "custom"

export interface PeriodValue {
  preset: PeriodPreset
  from: Date
  to: Date
}

interface PeriodFilterProps {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Aujourd'hui",
  week: "7 derniers jours",
  month: "30 derniers jours",
  year: "12 derniers mois",
  all: "Tout l'historique",
  custom: "Personnalisé",
}

function computeRange(preset: PeriodPreset): { from: Date; to: Date } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)
  const from = new Date(now)
  switch (preset) {
    case "today":
      from.setHours(0, 0, 0, 0)
      break
    case "week":
      from.setDate(now.getDate() - 7)
      from.setHours(0, 0, 0, 0)
      break
    case "month":
      from.setMonth(now.getMonth() - 1)
      from.setHours(0, 0, 0, 0)
      break
    case "year":
      from.setFullYear(now.getFullYear() - 1)
      from.setHours(0, 0, 0, 0)
      break
    case "all":
      return { from: new Date("2020-01-01"), to }
    case "custom":
      // Pour custom, on garde la plage existante côté appelant
      from.setMonth(now.getMonth() - 1)
      from.setHours(0, 0, 0, 0)
      break
  }
  return { from, to }
}

function toInputDate(d: Date): string {
  // YYYY-MM-DD en heure locale, compatible <input type="date">
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function parseInputDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (isNaN(d.getTime())) return null
  return d
}

function formatRange(from: Date, to: Date): string {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return `${fmt.format(from)} → ${fmt.format(to)}`
}

export function getDefaultPeriod(): PeriodValue {
  const { from, to } = computeRange("month")
  return { preset: "month", from, to }
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [fromInput, setFromInput] = React.useState(toInputDate(value.from))
  const [toInput, setToInput] = React.useState(toInputDate(value.to))
  const [customError, setCustomError] = React.useState<string | null>(null)

  // Resync inputs when value changes externally (e.g. preset switch)
  React.useEffect(() => {
    setFromInput(toInputDate(value.from))
    setToInput(toInputDate(value.to))
    setCustomError(null)
  }, [value.from, value.to])

  const handlePresetChange = (next: PeriodPreset) => {
    if (next === "custom") {
      onChange({ ...value, preset: "custom" })
      return
    }
    const { from, to } = computeRange(next)
    onChange({ preset: next, from, to })
  }

  const handleApplyCustom = () => {
    const from = parseInputDate(fromInput)
    const to = parseInputDate(toInput)
    if (!from || !to) {
      setCustomError("Dates invalides")
      return
    }
    if (from > to) {
      setCustomError("La date de début doit être avant la date de fin")
      return
    }
    from.setHours(0, 0, 0, 0)
    to.setHours(23, 59, 59, 999)
    setCustomError(null)
    onChange({ preset: "custom", from, to })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs md:flex-row md:items-center md:justify-between md:p-4">
      <div className="flex items-center gap-2">
        <IconCalendar className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Période :</span>
        <span className="text-sm text-muted-foreground">
          {formatRange(value.from, value.to)}
        </span>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="min-w-[180px]">
          <Label htmlFor="period-preset" className="sr-only">
            Préréglage
          </Label>
          <Select value={value.preset} onValueChange={(v) => handlePresetChange(v as PeriodPreset)}>
            <SelectTrigger id="period-preset" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["today", "week", "month", "year", "all", "custom"] as PeriodPreset[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PRESET_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {value.preset === "custom" && (
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="flex flex-col gap-1">
              <Label htmlFor="period-from" className="text-xs text-muted-foreground">
                Du
              </Label>
              <Input
                id="period-from"
                type="date"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="period-to" className="text-xs text-muted-foreground">
                Au
              </Label>
              <Input
                id="period-to"
                type="date"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            <Button onClick={handleApplyCustom} size="sm" className="h-9">
              Appliquer
            </Button>
          </div>
        )}
      </div>

      {customError && (
        <p className="text-xs text-destructive md:order-last md:w-full">{customError}</p>
      )}
    </div>
  )
}
