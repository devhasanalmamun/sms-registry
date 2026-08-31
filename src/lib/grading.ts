/**
 * Grade classification.
 *
 * Staff enter a number; marksheets and transcripts talk in bands. Deriving the
 * band rather than storing it means a change of policy is a code change, not a
 * data migration — and a stored band can never disagree with the mark it was
 * derived from.
 *
 * The thresholds are the institution's, and they are stated once here:
 *
 *   Distinction  >= 70
 *   Merit        >= 60
 *   Pass         >= 40
 *   Fail          < 40
 *
 * Note the gap this leaves on purpose: 50 is a Pass, not a band of its own.
 * These are the published rules, not the UK honours ladder, and inventing an
 * extra band to fill the space between 40 and 60 would put marks on a
 * transcript that the regulations do not recognise.
 */

export type Band = "Distinction" | "Merit" | "Pass" | "Fail";

export type Classification = {
  /** The band as it is written on a transcript. */
  band: Band;
  /** The same thing, short enough for a table cell. */
  short: string;
  passed: boolean;
};

/** The mark at or above which a student has passed. */
export const PASS_MARK = 40;
export const MERIT_MARK = 60;
export const DISTINCTION_MARK = 70;

export function classify(score: number): Classification {
  if (score >= DISTINCTION_MARK)
    return { band: "Distinction", short: "Dist", passed: true };
  if (score >= MERIT_MARK) return { band: "Merit", short: "Merit", passed: true };
  if (score >= PASS_MARK) return { band: "Pass", short: "Pass", passed: true };
  return { band: "Fail", short: "Fail", passed: false };
}

export function isValidScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}

/** Mean of a set of marks, rounded to one decimal place. */
export function averageScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const total = scores.reduce((a, b) => a + b, 0);
  return Math.round((total / scores.length) * 10) / 10;
}
