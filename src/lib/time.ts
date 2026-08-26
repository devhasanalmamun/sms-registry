import { INSTITUTION_TIME_ZONE } from "@/lib/format";

/**
 * Turning form input into instants.
 *
 * An `<input type="datetime-local">` submits a naive wall-clock string with no
 * zone: "2026-09-10T17:00". Handing that straight to `new Date()` interprets it
 * in whatever timezone the *server* happens to run in — so a deadline typed as
 * 17:00 by a London registrar became 11:00 when the server ran in Asia/Dhaka,
 * and would land somewhere else again on a different host. Deadlines decide
 * whether work is late, so this is not a cosmetic problem.
 *
 * A deadline means 17:00 on the institution's clock. These helpers pin that
 * down explicitly instead of inheriting it from the host.
 *
 * No date library: `Intl` already knows every zone's offset, including DST.
 */

/** The zone's offset from UTC, in milliseconds, at a given instant. */
function offsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    // Intl renders midnight as hour 24 in some engines.
    get("hour") % 24,
    get("minute"),
    get("second"),
  );

  return asIfUtc - at.getTime();
}

/**
 * Reads "YYYY-MM-DDTHH:mm" as a wall-clock time in `timeZone` and returns the
 * instant it names. Returns null if the string is not that shape.
 *
 * The offset is applied twice because the offset itself depends on the instant:
 * the first pass gets close enough to pick the right side of a DST boundary,
 * the second settles it.
 */
export function wallClockToInstant(
  naive: string,
  timeZone: string = INSTITUTION_TIME_ZONE,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    naive.trim(),
  );
  if (!match) return null;

  const [, y, mo, d, h, mi, s] = match;
  const base = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s ?? 0),
  );

  let instant = base;
  for (let i = 0; i < 2; i++) {
    instant = base - offsetMs(new Date(instant), timeZone);
  }

  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result;
}

/**
 * Reads "YYYY-MM-DD" as a date-only value: midnight UTC, which is how Postgres
 * `date` columns come back. Deliberately *not* zone-adjusted — a date of birth
 * is a date, not a moment, and shifting it by an offset moves it a day.
 */
export function dateOnlyToUtc(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, y, mo, d] = match;
  const result = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));

  // Rejects the likes of 2026-02-31, which Date.UTC would silently roll over.
  if (
    result.getUTCFullYear() !== Number(y) ||
    result.getUTCMonth() !== Number(mo) - 1 ||
    result.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return result;
}

/**
 * A date-only value `months` after `from`, clamped to the end of the month.
 *
 * `Date.UTC(y, m + 1, 31)` rolls a 31 January enrolment forward to 3 March,
 * which is not what "due in a month" means to anyone.
 */
export function addMonthsDateOnly(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + months;
  const day = from.getUTCDate();

  // Day 0 of the following month is the last day of the target month.
  const lastDayOfTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTarget)));
}
