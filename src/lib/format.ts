// Presentation helpers. Deliberately free of any Prisma import so that client
// components can use them without dragging the query engine into the bundle.

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

/** "3450.00" -> "£3,450.00". Takes the string form a Decimal serialises to. */
export function formatMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? money.format(n) : "—";
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatDate(value: Date | string): string {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFmt.format(new Date(value));
}

/** "in 3 days" / "6 days ago" — Registry staff think in deadlines, not dates. */
export function relativeToNow(value: Date | string, now: Date = new Date()): string {
  const diffMs = new Date(value).getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms || unit === "minute") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "now";
}

/** For a <input type="date"> default value. */
export function toDateInput(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
