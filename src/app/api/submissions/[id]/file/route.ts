import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { readSubmissionFile } from "@/lib/storage";
import {
  CANONICAL_MIME,
  extensionOf,
  safeHeaderFilename,
} from "@/lib/submissions";

/**
 * Download a submitted file.
 *
 * Three things this route has to get right, in order of how badly each one
 * bites:
 *
 *  1. **Authorisation.** Staff may read any submission; a student may read only
 *     their own. Without this the file URL is an unauthenticated way to read
 *     someone else's coursework — the classic mistake in a system that gets the
 *     on-screen permissions right and forgets the attachment.
 *
 *  2. **The Content-Type is ours, not the uploader's.** Serving a file back
 *     with a type the uploader chose lets them have their own bytes rendered
 *     as HTML from our origin: stored XSS against every marker who opens it.
 *     The type is re-derived here from the stored extension, `nosniff` stops
 *     the browser second-guessing it, and a CSP neutralises the file even if
 *     something upstream ever gets this wrong.
 *
 *  3. **The filename is sanitised before it goes in a header.** A quote or a
 *     newline in a student's filename would otherwise escape the quoted string
 *     and inject header parameters of their choosing.
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

  // The stored name is one we generated, so its extension is trustworthy in a
  // way the original filename and the upload's Content-Type are not.
  const contentType =
    extensionOf(submission.storedName) === ".pdf"
      ? CANONICAL_MIME.pdf
      : CANONICAL_MIME.docx;

  const asciiName = safeHeaderFilename(submission.originalName);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(submission.originalName)}`,
      "X-Content-Type-Options": "nosniff",
      // Belt and braces: even if a file were somehow served as HTML, it can
      // load nothing and run nothing.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // Coursework is not something to leave in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
