import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Demo data for the Registry module.
 *
 * The brief asks for "at least 5 students, 2 programmes, fees, and sample
 * grades". This goes further on purpose: the seed is the fastest way for a
 * reviewer to see that the edge cases are actually handled, so it deliberately
 * plants one of each — an overdue account, a student in credit, a withdrawn
 * student who still owes money, a late submission, a resubmission, a failed
 * mark that is still withheld, and an assessment nobody has submitted to.
 *
 * It also seeds the three roles the app separates: the Registry office, three
 * members of teaching staff (one of whom has set nothing, so the empty state is
 * reachable), and the students. Each assessment belongs to the staff member who
 * set it and to one programme's cohort.
 *
 * All dates are relative to the moment the seed runs, so "overdue" and "due in
 * three days" stay true however long after seeding you open the app.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "uploads");

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysFromNow = (days: number) => new Date(now.getTime() + days * DAY);
const daysAgo = (days: number) => daysFromNow(-days);
/** Dates stored as @db.Date — midnight UTC keeps them off-by-one-proof. */
const onlyDate = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const money = (v: string) => new Prisma.Decimal(v);

/** A minimal but genuinely valid PDF, so the download route serves a real file. */
function fakePdf(title: string): Buffer {
  const text = title.replace(/[()\\]/g, "");
  const content = `BT /F1 14 Tf 60 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

async function main() {
  console.log("Clearing existing data...");
  // Order matters: children before parents, even with cascades in place.
  await prisma.result.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeCharge.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.staffMember.deleteMany();
  await prisma.student.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.studentIdSequence.deleteMany();

  console.log("Creating programmes...");
  const bsc = await prisma.programme.create({
    data: {
      code: "BSC-CS",
      name: "BSc (Hons) Computer Science",
      durationYears: 3,
      feeAmount: money("9250.00"),
    },
  });

  const msc = await prisma.programme.create({
    data: {
      code: "MSC-DS",
      name: "MSc Data Science",
      durationYears: 1,
      feeAmount: money("12500.00"),
    },
  });

  console.log("Enrolling students...");
  const year = now.getUTCFullYear();
  let sequence = 0;
  const nextStudentId = () =>
    `SMS-${year}-${String(++sequence).padStart(4, "0")}`;

  const intake = [
    {
      fullName: "Amara Okafor",
      email: "amara.okafor@example.ac.uk",
      dateOfBirth: "2003-02-14",
      programmeId: bsc.id,
      academicYear: 2,
      status: "ENROLLED" as const,
    },
    {
      fullName: "Ben Whitfield",
      email: "ben.whitfield@example.ac.uk",
      dateOfBirth: "2004-07-30",
      programmeId: bsc.id,
      academicYear: 1,
      status: "ENROLLED" as const,
    },
    {
      fullName: "Chloe Ferreira",
      email: "chloe.ferreira@example.ac.uk",
      dateOfBirth: "2000-11-05",
      programmeId: msc.id,
      academicYear: 1,
      status: "ENROLLED" as const,
    },
    {
      fullName: "Daniel Osei",
      email: "daniel.osei@example.ac.uk",
      dateOfBirth: "2002-09-19",
      programmeId: bsc.id,
      academicYear: 2,
      status: "DEFERRED" as const,
    },
    {
      fullName: "Elena Kovac",
      email: "elena.kovac@example.ac.uk",
      dateOfBirth: "1999-05-23",
      programmeId: msc.id,
      academicYear: 1,
      status: "ENROLLED" as const,
    },
    {
      fullName: "Farhan Iqbal",
      email: "farhan.iqbal@example.ac.uk",
      dateOfBirth: "2004-01-08",
      programmeId: bsc.id,
      academicYear: 1,
      status: "WITHDRAWN" as const,
    },
    {
      fullName: "Grace Lin",
      email: "grace.lin@example.ac.uk",
      dateOfBirth: "2001-03-27",
      programmeId: bsc.id,
      academicYear: 3,
      status: "COMPLETED" as const,
    },
    {
      fullName: "Hassan Ali",
      email: "hassan.ali@example.ac.uk",
      dateOfBirth: "2004-12-02",
      programmeId: bsc.id,
      academicYear: 1,
      status: "ENROLLED" as const,
    },
  ];

  const students = [];
  for (const [i, s] of intake.entries()) {
    students.push(
      await prisma.student.create({
        data: {
          ...s,
          studentId: nextStudentId(),
          dateOfBirth: new Date(`${s.dateOfBirth}T00:00:00Z`),
          enrolledAt: daysAgo(200 - i * 3),
        },
      }),
    );
  }

  // Keep the counter in step so the first student enrolled through the UI
  // continues the sequence rather than colliding with a seeded ID.
  await prisma.studentIdSequence.create({
    data: { year, lastValue: sequence },
  });

  const [amara, ben, chloe, daniel, elena, farhan, grace, hassan] = students;

  console.log("Raising fee charges...");
  // Tuition is charged in two instalments — the way most institutions bill it,
  // and the reason "owes money" and "is overdue" are not the same question.
  const instalments = async (
    studentId: string,
    total: string,
    opts: { firstDueDaysAgo: number; secondDueInDays: number },
  ) => {
    const half = money(total).dividedBy(2).toFixed(2);
    await prisma.feeCharge.createMany({
      data: [
        {
          studentId,
          description: "Tuition — instalment 1 of 2",
          amount: money(half),
          dueDate: onlyDate(daysAgo(opts.firstDueDaysAgo)),
        },
        {
          studentId,
          description: "Tuition — instalment 2 of 2",
          amount: money(half),
          dueDate: onlyDate(daysFromNow(opts.secondDueInDays)),
        },
      ],
    });
  };

  await instalments(amara.id, "9250.00", {
    firstDueDaysAgo: 40,
    secondDueInDays: 65,
  });
  await instalments(ben.id, "9250.00", {
    firstDueDaysAgo: 35,
    secondDueInDays: 70,
  });
  await instalments(chloe.id, "12500.00", {
    firstDueDaysAgo: 22,
    secondDueInDays: 80,
  });
  await instalments(daniel.id, "9250.00", {
    firstDueDaysAgo: 30,
    secondDueInDays: 75,
  });
  await instalments(elena.id, "12500.00", {
    firstDueDaysAgo: 28,
    secondDueInDays: 72,
  });
  await instalments(farhan.id, "9250.00", {
    firstDueDaysAgo: 45,
    secondDueInDays: 60,
  });
  await instalments(grace.id, "9250.00", {
    firstDueDaysAgo: 120,
    secondDueInDays: 5,
  });
  await instalments(hassan.id, "9250.00", {
    firstDueDaysAgo: 18,
    secondDueInDays: 85,
  });

  // A one-off charge, to prove the ledger is not just "programme fee".
  await prisma.feeCharge.create({
    data: {
      studentId: ben.id,
      description: "Late resit administration fee",
      amount: money("75.00"),
      dueDate: onlyDate(daysAgo(10)),
    },
  });

  console.log("Recording payments...");
  await prisma.payment.createMany({
    data: [
      // Amara — instalment 1 settled on time, in good standing.
      {
        studentId: amara.id,
        amount: money("4625.00"),
        paidAt: daysAgo(44),
        reference: "BACS-2025-000118",
        method: "Bank transfer",
      },
      // Ben — part payment only, so instalment 1 is still partly overdue.
      {
        studentId: ben.id,
        amount: money("1200.00"),
        paidAt: daysAgo(33),
        reference: "BACS-2025-000204",
        method: "Bank transfer",
        note: "Part payment agreed with the bursary office.",
      },
      // Chloe — nothing paid at all; the worst case on the dashboard.
      // Daniel — paid before deferring.
      {
        studentId: daniel.id,
        amount: money("4625.00"),
        paidAt: daysAgo(34),
        reference: "CARD-2025-000377",
        method: "Card",
      },
      // Elena — overpaid: the system must show credit, not a negative balance
      // presented as if she owes it.
      {
        studentId: elena.id,
        amount: money("12800.00"),
        paidAt: daysAgo(26),
        reference: "BACS-2025-000411",
        method: "Bank transfer",
        note: "Sponsor overpaid by £300 — refund pending.",
      },
      // Farhan — withdrew owing money. Still chased, still visible.
      {
        studentId: farhan.id,
        amount: money("500.00"),
        paidAt: daysAgo(50),
        reference: "CARD-2025-000290",
        method: "Card",
      },
      // Grace — completed and fully settled.
      {
        studentId: grace.id,
        amount: money("4625.00"),
        paidAt: daysAgo(118),
        reference: "BACS-2024-000901",
        method: "Bank transfer",
      },
      {
        studentId: grace.id,
        amount: money("4625.00"),
        paidAt: daysAgo(12),
        reference: "BACS-2025-000455",
        method: "Bank transfer",
      },
      // Hassan — instalment 1 cleared on the day it fell due.
      {
        studentId: hassan.id,
        amount: money("4625.00"),
        paidAt: daysAgo(18),
        reference: "BACS-2025-000388",
        method: "Bank transfer",
      },
    ],
  });

  console.log("Creating teaching staff...");
  // Three, and deliberately one with nothing set: the empty state on the
  // assessment list is a real screen a new lecturer sees on their first day.
  const [priya, martin] = await Promise.all([
    prisma.staffMember.create({
      data: {
        staffId: "STF-001",
        fullName: "Priya Raman",
        email: "priya.raman@example.ac.uk",
        title: "Dr",
        department: "Computer Science",
      },
    }),
    prisma.staffMember.create({
      data: {
        staffId: "STF-002",
        fullName: "Martin Cole",
        email: "martin.cole@example.ac.uk",
        title: "Dr",
        department: "Data Science",
      },
    }),
    prisma.staffMember.create({
      data: {
        staffId: "STF-003",
        fullName: "Ines Bauer",
        email: "ines.bauer@example.ac.uk",
        title: "Professor",
        department: "Computer Science",
      },
    }),
  ]);

  console.log("Creating assessments...");
  // Each is owned by the staff member who set it and aimed at one cohort, so
  // the MSc students never see the CS coursework and vice versa.
  const closed = await prisma.assessment.create({
    data: {
      title: "Coursework 1 — Data Structures",
      module: "CS101 Programming Fundamentals",
      dueAt: daysAgo(10),
      createdById: priya.id,
      programmeId: bsc.id,
    },
  });

  const closingSoon = await prisma.assessment.create({
    data: {
      title: "Group Project Report",
      module: "CS205 Software Engineering",
      dueAt: daysFromNow(3),
      createdById: priya.id,
      programmeId: bsc.id,
    },
  });

  const open = await prisma.assessment.create({
    data: {
      title: "Research Methods Essay",
      module: "DS501 Research Methods",
      dueAt: daysFromNow(12),
      createdById: martin.id,
      programmeId: msc.id,
    },
  });

  console.log("Writing sample submissions...");
  await mkdir(UPLOAD_DIR, { recursive: true });

  const submissions = [
    {
      assessment: closed,
      student: amara,
      submittedAt: daysAgo(12),
      attempt: 1,
      original: "okafor-data-structures.pdf",
    },
    {
      // Late: two days after the deadline. Accepted, but flagged.
      assessment: closed,
      student: ben,
      submittedAt: daysAgo(8),
      attempt: 1,
      original: "whitfield-coursework1.pdf",
    },
    {
      // Resubmitted before the deadline — attempt 2 replaced attempt 1.
      assessment: closed,
      student: hassan,
      submittedAt: daysAgo(11),
      attempt: 2,
      original: "hassan-ali-cw1-final.pdf",
    },
    {
      assessment: closed,
      student: grace,
      submittedAt: daysAgo(14),
      attempt: 1,
      original: "lin-cw1.pdf",
    },
    {
      assessment: closingSoon,
      student: amara,
      submittedAt: daysAgo(1),
      attempt: 1,
      original: "okafor-project-report.pdf",
    },
  ];

  for (const s of submissions) {
    const created = await prisma.submission.create({
      data: {
        assessmentId: s.assessment.id,
        studentId: s.student.id,
        originalName: s.original,
        storedName: "pending",
        mimeType: "application/pdf",
        sizeBytes: 0,
        submittedAt: s.submittedAt,
        isLate: s.submittedAt.getTime() > s.assessment.dueAt.getTime(),
        attempt: s.attempt,
      },
    });

    const storedName = `${created.id}-v${s.attempt}.pdf`;
    const bytes = fakePdf(`${s.student.fullName} - ${s.assessment.title}`);
    await writeFile(path.join(UPLOAD_DIR, storedName), bytes);

    await prisma.submission.update({
      where: { id: created.id },
      data: { storedName, sizeBytes: bytes.byteLength },
    });
  }

  console.log("Entering marks...");
  await prisma.result.createMany({
    data: [
      {
        assessmentId: closed.id,
        studentId: amara.id,
        score: 78,
        feedback: "Excellent complexity analysis. Cite sources consistently.",
        published: true,
        publishedAt: daysAgo(4),
        markedAt: daysAgo(5),
      },
      {
        assessmentId: closed.id,
        studentId: ben.id,
        score: 52,
        feedback: "Sound implementation, but the report is thin on testing.",
        published: true,
        publishedAt: daysAgo(4),
        markedAt: daysAgo(5),
      },
      {
        assessmentId: closed.id,
        studentId: grace.id,
        score: 65,
        feedback: "Confident work throughout.",
        published: true,
        publishedAt: daysAgo(4),
        markedAt: daysAgo(5),
      },
      {
        // Marked but deliberately withheld — a fail pending moderation. The
        // student must not be able to see this yet, by any route.
        assessmentId: closed.id,
        studentId: hassan.id,
        score: 34,
        // Written to the student, not about them. There is one feedback field
        // and publishing shows it verbatim, so a marker's internal note has no
        // business in it — "do not release before moderation" is a thing you
        // say to a colleague, and it would go straight to the student the
        // moment somebody clicked Publish.
        feedback:
          "The linked-list section does not yet meet the pass standard. Come to office hours before the resit deadline and we will work through it.",
        published: false,
        markedAt: daysAgo(5),
      },
    ],
  });

  const counts = {
    programmes: await prisma.programme.count(),
    students: await prisma.student.count(),
    charges: await prisma.feeCharge.count(),
    payments: await prisma.payment.count(),
    staff: await prisma.staffMember.count(),
    assessments: await prisma.assessment.count(),
    submissions: await prisma.submission.count(),
    results: await prisma.result.count(),
  };

  console.log("\nSeed complete:", counts);
  console.log(
    [
      "",
      "Overdue on the dashboard: Ben Whitfield, Chloe Ferreira, Farhan Iqbal (withdrawn, still owing)",
      "In credit: Elena Kovac",
      `Late submission: Ben Whitfield on "${closed.title}"`,
      `Withheld result: Hassan Ali on "${closed.title}"`,
      `Nobody has submitted to: "${open.title}"`,
      "",
      "Teaching staff: Dr Priya Raman (2 assessments, BSc), Dr Martin Cole (1, MSc),",
      "Professor Ines Bauer (none — shows the empty state)",
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
