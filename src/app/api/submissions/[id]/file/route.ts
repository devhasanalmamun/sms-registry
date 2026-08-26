import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { readSubmissionFile } from "@/lib/storage";

/**
 * Download a submitted file.
 *
 * The check is the point: staff may read any submission, a student may read
 * only their own. Without this, the file URL would be an unauthenticated way
 * to read another student's coursework — the classic mistake in a system that
 * gets the on-screen permissions right and forgets the attachment.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: {
      studentId: true,
      storedName: true,
      originalName: true,
      mimeType: true,
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "No such submission." }, { status: 404 });
  }

  if (session.role === "student" && session.studentId !== submission.studentId) {
    // Deliberately 404, not 403: confirming the file exists tells someone
    // browsing ids that they found a real submission.
    return NextResponse.json({ error: "No such submission." }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readSubmissionFile(submission.storedName);
  } catch {
    return NextResponse.json(
      {
        error:
          "The record exists but the file is missing from storage. Ask Registry to request a resubmission.",
      },
      { status: 410 },
    );
  }

  // ASCII fallback plus the RFC 5987 form, so a name with an accent in it
  // still downloads correctly.
  const asciiName = submission.originalName.replace(/[^\x20-\x7e]/g, "_");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": submission.mimeType || "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(submission.originalName)}`,
      // Coursework is not something to leave in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
