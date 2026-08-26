import { describe, expect, it } from "vitest";
import {
  CANONICAL_MIME,
  decideSubmission,
  identifyUpload,
  isLate,
  safeHeaderFilename,
  storedNameFor,
} from "./submissions";

const DUE = new Date("2026-06-01T17:00:00Z");
const before = new Date("2026-05-30T09:00:00Z");
const after = new Date("2026-06-03T09:00:00Z");

const bytesOf = (...values: number[]) => new Uint8Array(values);
const PDF = bytesOf(0x25, 0x50, 0x44, 0x46, 0x2d);
const ZIP = bytesOf(0x50, 0x4b, 0x03, 0x04, 0x14);
const TEXT = bytesOf(0x68, 0x65, 0x6c, 0x6c, 0x6f);

describe("isLate", () => {
  it("is false up to the deadline and true after it", () => {
    expect(isLate(before, DUE)).toBe(false);
    expect(isLate(DUE, DUE)).toBe(false);
    expect(isLate(after, DUE)).toBe(true);
  });
});

describe("identifyUpload", () => {
  it("accepts a real PDF and a real DOCX", () => {
    expect(identifyUpload("essay.pdf", PDF)).toBe("pdf");
    expect(identifyUpload("report.docx", ZIP)).toBe("docx");
  });

  it("rejects a file renamed to look like a PDF", () => {
    expect(identifyUpload("essay.pdf", TEXT)).toBeNull();
  });

  it("rejects a real PDF with the wrong extension", () => {
    // Both signals have to agree — otherwise a .exe with a PDF header slips in.
    expect(identifyUpload("essay.exe", PDF)).toBeNull();
  });

  it("rejects file types that are not accepted at all", () => {
    expect(identifyUpload("photo.png", bytesOf(0x89, 0x50, 0x4e, 0x47))).toBeNull();
  });

  it("is not fooled by capitalisation", () => {
    expect(identifyUpload("ESSAY.PDF", PDF)).toBe("pdf");
  });
});

describe("decideSubmission", () => {
  const base = { dueAt: DUE, studentStatus: "ENROLLED" as const };

  it("accepts a first submission before the deadline", () => {
    const d = decideSubmission({ ...base, now: before, existing: null });
    expect(d).toEqual({ allowed: true, late: false });
  });

  it("accepts a first submission after the deadline, flagged late", () => {
    // Refusing it would leave the student with no record at all, which helps
    // nobody. The flag is what the board needs, not a locked door.
    const d = decideSubmission({ ...base, now: after, existing: null });
    expect(d).toEqual({ allowed: true, late: true });
  });

  it("allows resubmission before the deadline", () => {
    const d = decideSubmission({
      ...base,
      now: before,
      existing: { submittedAt: new Date("2026-05-20T10:00:00Z") },
    });
    expect(d.allowed).toBe(true);
  });

  it("refuses resubmission once the deadline has passed", () => {
    const d = decideSubmission({
      ...base,
      now: after,
      existing: { submittedAt: before },
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toMatch(/deadline has passed/i);
  });

  it("refuses any submission from a withdrawn student", () => {
    const d = decideSubmission({
      ...base,
      now: before,
      existing: null,
      studentStatus: "WITHDRAWN",
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toMatch(/withdrawn/i);
  });

  it("still lets a deferred student submit", () => {
    const d = decideSubmission({
      ...base,
      now: before,
      existing: null,
      studentStatus: "DEFERRED",
    });
    expect(d.allowed).toBe(true);
  });
});

describe("storedNameFor", () => {
  it("names files from our own ids, never the upload's name", () => {
    expect(storedNameFor("abc123", 2, "docx")).toBe("abc123-v2.docx");
  });
});

describe("safeHeaderFilename", () => {
  it("leaves an ordinary filename alone", () => {
    expect(safeHeaderFilename("okafor-essay.pdf")).toBe("okafor-essay.pdf");
  });

  it("neutralises quotes and backslashes that would escape the header value", () => {
    // Without this, a filename can close the quoted string and append
    // parameters of the uploader's choosing to Content-Disposition.
    expect(safeHeaderFilename('a".pdf')).toBe("a_.pdf");
    expect(safeHeaderFilename("a\\b.pdf")).toBe("a_b.pdf");
  });

  it("strips control characters that would split the header", () => {
    expect(safeHeaderFilename("a\r\nSet-Cookie: x=1.pdf")).toBe(
      "a__Set-Cookie: x=1.pdf",
    );
  });

  it("falls back to a name rather than an empty header value", () => {
    expect(safeHeaderFilename("\r\n")).toBe("submission");
  });

  it("caps the length", () => {
    expect(safeHeaderFilename("a".repeat(400)).length).toBe(120);
  });
});

describe("CANONICAL_MIME", () => {
  it("is the only source of a served Content-Type", () => {
    // The upload's own Content-Type is a claim by the client. Echoing it back
    // would allow a student's file to be served as text/html from our origin.
    expect(CANONICAL_MIME.pdf).toBe("application/pdf");
    expect(CANONICAL_MIME.docx).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });
});
