import { describe, expect, it } from "vitest";
import {
  canReadSubmission,
  cohortWhere,
  isInCohort,
  ownsAssessment,
} from "@/lib/access";
import type { Session } from "@/lib/session";

/**
 * The role split, tested at the level it is actually decided.
 *
 * The interesting cases are all negative: what a role may *not* do. A test that
 * only checks the happy path would pass just as happily against a function that
 * returns true unconditionally.
 */

const registry: Session = { role: "registry", staffId: null, studentId: null };
const priya: Session = { role: "staff", staffId: "staff-priya", studentId: null };
const martin: Session = { role: "staff", staffId: "staff-martin", studentId: null };
const amara: Session = { role: "student", staffId: null, studentId: "stu-amara" };
const ben: Session = { role: "student", staffId: null, studentId: "stu-ben" };

const priyasAssessment = { createdById: "staff-priya" };

describe("ownsAssessment", () => {
  it("is true only for the staff member who set it", () => {
    expect(ownsAssessment(priya, priyasAssessment)).toBe(true);
    expect(ownsAssessment(martin, priyasAssessment)).toBe(false);
  });

  it("is false for Registry, who cannot mark anything", () => {
    expect(ownsAssessment(registry, priyasAssessment)).toBe(false);
  });

  it("is false for a student, whatever ids happen to collide", () => {
    // A student session carries a null staffId. If ownership were checked as
    // `session.staffId === createdById` without the role test, a null on both
    // sides would grant marking rights to a student.
    expect(ownsAssessment(amara, { createdById: null as unknown as string })).toBe(
      false,
    );
  });
});

describe("isInCohort", () => {
  it("matches a student to the programme the work was set for", () => {
    expect(isInCohort({ programmeId: "bsc" }, { programmeId: "bsc" })).toBe(true);
    expect(isInCohort({ programmeId: "msc" }, { programmeId: "bsc" })).toBe(false);
  });
});

describe("canReadSubmission", () => {
  const amarasWork = {
    studentId: "stu-amara",
    assessment: { createdById: "staff-priya" },
  };

  it("lets a student read their own work and nobody else's", () => {
    expect(canReadSubmission(amara, amarasWork)).toBe(true);
    expect(canReadSubmission(ben, amarasWork)).toBe(false);
  });

  it("lets the marker read work handed in for their own assessment", () => {
    expect(canReadSubmission(priya, amarasWork)).toBe(true);
  });

  it("refuses a staff member who did not set the assessment", () => {
    // The whole point of the file route: knowing the id is not authorisation.
    expect(canReadSubmission(martin, amarasWork)).toBe(false);
  });

  it("refuses the Registry office outright", () => {
    // Registry can see a student's record and their ledger. Coursework is not
    // part of either.
    expect(canReadSubmission(registry, amarasWork)).toBe(false);
  });
});

describe("the cohort, as one definition", () => {
  it("excludes withdrawn students, not just other programmes", () => {
    // Regression: `saveGrade` filtered on programme alone while the marking
    // sheet filtered on programme *and* status, so a withdrawn student could be
    // given a mark that showed on no marking sheet and on their own marksheet.
    const where = cohortWhere("bsc");

    expect(where.programmeId).toBe("bsc");
    expect(where.status.in).toEqual(["ENROLLED", "DEFERRED", "COMPLETED"]);
    expect(where.status.in).not.toContain("WITHDRAWN");
  });
});
