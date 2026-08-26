/**
 * Grade classification.
 *
 * Staff enter a number; Registry, students and transcripts all talk in bands.
 * Deriving the band rather than storing it means a change of policy is a code
 * change, not a data migration — and a stored band can never disagree with the
 * mark it was derived from.
 *
 * Bands follow the standard UK undergraduate classification.
 */

export type Classification = {
  band: string;
  short: string;
  passed: boolean;
};

export function classify(score: number): Classification {
  if (score >= 70) return { band: "First (1st)", short: "1st", passed: true };
  if (score >= 60) return { band: "Upper second (2:1)", short: "2:1", passed: true };
  if (score >= 50) return { band: "Lower second (2:2)", short: "2:2", passed: true };
  if (score >= 40) return { band: "Third (3rd)", short: "3rd", passed: true };
  return { band: "Fail", short: "Fail", passed: false };
}

export const PASS_MARK = 40;

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
