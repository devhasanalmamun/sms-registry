import { describe, expect, it, vi } from "vitest";
import { allocateStudentId, formatStudentId, parseStudentId } from "./student-id";

describe("formatStudentId", () => {
  it("pads the sequence to four digits", () => {
    expect(formatStudentId(2026, 1)).toBe("SMS-2026-0001");
    expect(formatStudentId(2026, 42)).toBe("SMS-2026-0042");
  });

  it("does not truncate once a year passes 9999 students", () => {
    expect(formatStudentId(2026, 12345)).toBe("SMS-2026-12345");
  });
});

describe("parseStudentId", () => {
  it("round-trips a formatted id", () => {
    expect(parseStudentId("SMS-2026-0042")).toEqual({ year: 2026, sequence: 42 });
  });

  it("accepts lower case, since staff type these by hand", () => {
    expect(parseStudentId("sms-2026-0042")).toEqual({ year: 2026, sequence: 42 });
  });

  it("rejects anything that is not a student id", () => {
    expect(parseStudentId("SMS-26-1")).toBeNull();
    expect(parseStudentId("hello")).toBeNull();
  });
});

describe("allocateStudentId", () => {
  it("increments the year's counter atomically and formats the result", async () => {
    // The upsert is what makes this safe under concurrency: it takes a row
    // lock, so two simultaneous enrolments queue rather than collide.
    const upsert = vi.fn().mockResolvedValue({ lastValue: 9 });
    const tx = { studentIdSequence: { upsert } } as never;

    await expect(allocateStudentId(tx, 2026)).resolves.toBe("SMS-2026-0009");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { year: 2026 },
        create: { year: 2026, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      }),
    );
  });
});
