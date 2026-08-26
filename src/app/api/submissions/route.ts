import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActingStudent } from "@/lib/session";
import {
  CANONICAL_MIME,
  decideSubmission,
  identifyUpload,
  storedNameFor,
} from "@/lib/submissions";
import {
  MAX_UPLOAD_BYTES,
  deleteSubmissionFile,
  saveSubmissionFile,
} from "@/lib/storage";

/**
 * Upload a submission.
 *
 * A route handler rather than a Server Action because it deals in a multipart
 * body and needs to return real HTTP status codes — this is the one endpoint a
 * student's browser posts a file to.
 *
 * Order of checks matters: identity, then the assessment, then the rules about
 * deadlines and resubmission, then the file itself. Cheap rejections first.
 */
export async function POST(request: Request) {
  const student = await getActingStudent();
  if (!student) {
    return NextResponse.json(
      { error: "Only a student can submit work. Switch to a student view first." },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "That upload could not be read. Try again." },
      { status: 400 },
    );
  }

  const assessmentId = String(form.get("assessmentId") ?? "");
  const file = form.get("file");

  if (!assessmentId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Choose a PDF or DOCX file to submit." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      },
      { status: 413 },
    );
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
  });
  if (!assessment) {
    return NextResponse.json(
      { error: "That assessment no longer exists." },
      { status: 404 },
    );
  }

  const existing = await prisma.submission.findUnique({
    where: {
      assessmentId_studentId: { assessmentId, studentId: student.id },
    },
  });

  const now = new Date();
  const decision = decideSubmission({
    now,
    dueAt: assessment.dueAt,
    existing,
    studentStatus: student.status,
  });

  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: 409 });
  }

  // Read the bytes and identify the file from its content, not its headers.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = identifyUpload(file.name, bytes);

  if (!kind) {
    return NextResponse.json(
      {
        error:
          "Only PDF and DOCX files are accepted, and the file has to genuinely be one — renaming something to .pdf will not work.",
      },
      { status: 415 },
    );
  }

  const attempt = existing ? existing.attempt + 1 : 1;

  try {
    const submission = await prisma.submission.upsert({
      where: {
        assessmentId_studentId: { assessmentId, studentId: student.id },
      },
      create: {
        assessmentId,
        studentId: student.id,
        originalName: file.name,
        storedName: "pending",
        // Our own type for the kind we identified, not the client's claim.
        mimeType: CANONICAL_MIME[kind],
        sizeBytes: bytes.byteLength,
        submittedAt: now,
        isLate: decision.late,
        attempt,
      },
      update: {
        originalName: file.name,
        mimeType: CANONICAL_MIME[kind],
        sizeBytes: bytes.byteLength,
        submittedAt: now,
        isLate: decision.late,
        attempt,
      },
    });

    const storedName = storedNameFor(submission.id, attempt, kind);
    await saveSubmissionFile(storedName, bytes);

    await prisma.submission.update({
      where: { id: submission.id },
      data: { storedName },
    });

    // A resubmission supersedes the previous attempt; the old file is of no
    // further use and keeping it would only confuse a later audit.
    if (existing && existing.storedName !== storedName) {
      await deleteSubmissionFile(existing.storedName);
    }

    revalidatePath("/me/assessments");
    revalidatePath(`/assessments/${assessmentId}`);
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      late: decision.late,
      attempt,
      resubmitted: Boolean(existing),
    });
  } catch (error) {
    console.error("Submission failed", error);
    return NextResponse.json(
      { error: "The submission could not be saved. Nothing was recorded — try again." },
      { status: 500 },
    );
  }
}
