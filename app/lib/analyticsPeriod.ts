/**
 * Parse les paramètres de période (period / from / to) communs aux endpoints d'analytics.
 *
 * Priorité : si `from` et `to` sont tous deux fournis et valides, ils sont utilisés.
 * Sinon, on retombe sur le préset `period` (today | week | month | year | all).
 *
 * `endDate` est borné à aujourd'hui (inclus).
 */
export type PeriodPreset = "today" | "week" | "month" | "year" | "all";

export interface ResolvedPeriod {
  startDate: Date;
  endDate: Date;
  period: PeriodPreset | "custom";
}

export interface ResolvePeriodError {
  error: string;
}

export function resolvePeriod(query: {
  period?: string;
  periode?: string;
  from?: string;
  to?: string;
}): ResolvedPeriod | ResolvePeriodError {
  const presetRaw = (query.period ?? query.periode ?? "month") as string;
  const allowedPresets: PeriodPreset[] = ["today", "week", "month", "year", "all"];
  const preset = (allowedPresets.includes(presetRaw as PeriodPreset)
    ? presetRaw
    : "month") as PeriodPreset;

  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now);

  if (query.from && query.to) {
    const parsedFrom = new Date(query.from);
    const parsedTo = new Date(query.to);
    if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
      return { error: "from/to invalides (format attendu : YYYY-MM-DD)" };
    }
    if (parsedFrom > parsedTo) {
      return { error: "from doit être <= to" };
    }
    startDate = parsedFrom;
    startDate.setHours(0, 0, 0, 0);
    endDate = parsedTo;
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate, period: "custom" };
  }

  switch (preset) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      startDate = new Date("2020-01-01");
      break;
  }

  return { startDate, endDate, period: preset };
}

export function isResolveError(
  r: ResolvedPeriod | ResolvePeriodError
): r is ResolvePeriodError {
  return (r as ResolvePeriodError).error !== undefined;
}
