import { describe, expect, it, vi } from "vitest";
import { allocateStudentId, formatStudentId, parseStudentId } from "./student-id";
import { classify, averageScore, isValidScore } from "./grading";

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

describe("classify", () => {
  it("puts each mark in the right band", () => {
    expect(classify(100).band).toBe("Distinction");
    expect(classify(78).band).toBe("Distinction");
    expect(classify(69).band).toBe("Merit");
    expect(classify(52).band).toBe("Pass");
    expect(classify(39).band).toBe("Fail");
    expect(classify(0).band).toBe("Fail");
  });

  // Every threshold is "or above", and off-by-one here puts the wrong
  // classification on a transcript.
  it("includes each boundary mark in the higher band", () => {
    expect(classify(70).band).toBe("Distinction");
    expect(classify(69).band).toBe("Merit");
    expect(classify(60).band).toBe("Merit");
    expect(classify(59).band).toBe("Pass");
    expect(classify(40).band).toBe("Pass");
    expect(classify(39).band).toBe("Fail");
  });

  it("treats 40 as the pass mark, inclusive", () => {
    expect(classify(40).passed).toBe(true);
    expect(classify(39).passed).toBe(false);
  });

  it("does not invent a band between Pass and Merit", () => {
    // 50 is an honours boundary elsewhere; under these regulations it is a
    // Pass like any other mark in the forties and fifties.
    expect(classify(50).band).toBe("Pass");
    expect(classify(45).band).toBe("Pass");
  });
});

describe("isValidScore", () => {
  it("accepts whole marks from 0 to 100 and nothing else", () => {
    expect(isValidScore(0)).toBe(true);
    expect(isValidScore(100)).toBe(true);
    expect(isValidScore(101)).toBe(false);
    expect(isValidScore(-1)).toBe(false);
    expect(isValidScore(72.5)).toBe(false);
    expect(isValidScore("72")).toBe(false);
  });
});

describe("averageScore", () => {
  it("returns null rather than NaN when nothing has been marked", () => {
    expect(averageScore([])).toBeNull();
  });

  it("rounds to one decimal place", () => {
    expect(averageScore([78, 52, 65, 34])).toBe(57.3);
  });
});
