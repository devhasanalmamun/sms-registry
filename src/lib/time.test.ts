import { describe, expect, it } from "vitest";
import { addMonthsDateOnly, dateOnlyToUtc, wallClockToInstant } from "./time";

/**
 * These pin down three bugs found by review:
 *
 *  1. A deadline typed as 17:00 was parsed in the *server's* timezone, so on a
 *     host in Asia/Dhaka a London registrar's 17:00 became 11:00 London.
 *  2. Date fields were parsed by string concatenation, which produced an
 *     Invalid Date for anything that was not exactly YYYY-MM-DD.
 *  3. "Due in a month" used Date.UTC(y, m + 1, d), rolling 31 January to
 *     3 March.
 */

describe("wallClockToInstant", () => {
  it("reads a wall clock in the institution's zone, not the host's", () => {
    // 10 September is BST (UTC+1), so 17:00 London is 16:00 UTC — whatever
    // timezone the server that runs this happens to be in.
    expect(wallClockToInstant("2026-09-10T17:00")?.toISOString()).toBe(
      "2026-09-10T16:00:00.000Z",
    );
  });

  it("handles a winter date, when London is UTC", () => {
    expect(wallClockToInstant("2026-01-15T17:00")?.toISOString()).toBe(
      "2026-01-15T17:00:00.000Z",
    );
  });

  it("gets both sides of a DST changeover right", () => {
    // BST starts 29 March 2026 at 01:00 UTC.
    expect(wallClockToInstant("2026-03-28T12:00")?.toISOString()).toBe(
      "2026-03-28T12:00:00.000Z",
    );
    expect(wallClockToInstant("2026-03-30T12:00")?.toISOString()).toBe(
      "2026-03-30T11:00:00.000Z",
    );
  });

  it("accepts an optional seconds component", () => {
    expect(wallClockToInstant("2026-01-15T17:00:30")?.toISOString()).toBe(
      "2026-01-15T17:00:30.000Z",
    );
  });

  it("rejects anything that is not a naive local date-time", () => {
    expect(wallClockToInstant("2026-09-10")).toBeNull();
    expect(wallClockToInstant("2026-09-10T17:00:00Z")).toBeNull();
    expect(wallClockToInstant("not a date")).toBeNull();
  });
});

describe("dateOnlyToUtc", () => {
  it("reads a date as midnight UTC, so it cannot shift a day", () => {
    expect(dateOnlyToUtc("2004-12-02")?.toISOString()).toBe(
      "2004-12-02T00:00:00.000Z",
    );
  });

  it("rejects a timestamp, which used to become an Invalid Date downstream", () => {
    expect(dateOnlyToUtc("2026-08-27T10:00:00Z")).toBeNull();
  });

  it("rejects a date that does not exist rather than rolling it over", () => {
    expect(dateOnlyToUtc("2026-02-31")).toBeNull();
    expect(dateOnlyToUtc("2026-13-01")).toBeNull();
  });

  it("accepts a real leap day", () => {
    expect(dateOnlyToUtc("2024-02-29")?.toISOString()).toBe(
      "2024-02-29T00:00:00.000Z",
    );
  });
});

describe("addMonthsDateOnly", () => {
  it("clamps to the end of a short month instead of overflowing", () => {
    // The bug: 31 January + 1 month used to land on 3 March.
    expect(
      addMonthsDateOnly(new Date("2026-01-31T00:00:00Z"), 1)
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-02-28");
  });

  it("uses the real length of February in a leap year", () => {
    expect(
      addMonthsDateOnly(new Date("2024-01-31T00:00:00Z"), 1)
        .toISOString()
        .slice(0, 10),
    ).toBe("2024-02-29");
  });

  it("keeps the day when the target month is long enough", () => {
    expect(
      addMonthsDateOnly(new Date("2026-08-27T00:00:00Z"), 1)
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-09-27");
  });

  it("rolls the year over", () => {
    expect(
      addMonthsDateOnly(new Date("2026-12-15T00:00:00Z"), 1)
        .toISOString()
        .slice(0, 10),
    ).toBe("2027-01-15");
  });
});
