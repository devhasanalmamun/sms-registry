import { describe, expect, it } from "vitest";
import { averageScore, classify, isValidScore } from "./grading";

/**
 * The classification the brief sets out: Pass from 40, Merit from 60,
 * Distinction from 70. Every threshold is "or above", so each boundary mark
 * belongs to the higher band — an off-by-one here puts the wrong class on a
 * transcript, which is why every boundary has its own assertion.
 */

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
