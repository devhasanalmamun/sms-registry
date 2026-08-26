# Registry — Student Management System

The Registry module of a student management system: the four workflows a Registry
administrator uses every day — **enrolment**, **fees and payments**, **assessment
submission**, and **marksheet and results** — plus the student's own view of the
same data.

Built with **Next.js (App Router)**, **PostgreSQL** and **Prisma**.

---

## Running it locally

**Prerequisites:** Node 20+, and a PostgreSQL database.

```bash
git clone https://github.com/devhasanalmamun/sms-registry.git
cd sms-registry
npm install                 # also runs `prisma generate`

cp .env.example .env        # then point DATABASE_URL at your database

npm run db:migrate          # applies the migrations
npm run db:seed             # loads the demo data
npm run dev                 # http://localhost:3000
```

**Any PostgreSQL works** — a local install, Neon, Supabase, RDS. `DATABASE_URL`
is the only thing that has to change. If you would rather not install one, a
`docker-compose.yml` is included purely as a convenience:

```bash
npm run db:up               # docker compose up -d — postgres:16 on port 5433
```

The `.env.example` connection string already matches that container, so with
Docker the sequence above works with no edits at all.

### Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | 51 unit tests (Vitest) over the fee, submission, date and grading rules |
| `npm run db:reset` | Drops, re-migrates and re-seeds — the fastest way back to a clean demo |
| `npm run db:studio` | Prisma Studio, to inspect the data directly |

### Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Read by Prisma via `prisma.config.ts` and passed to the client through the `@prisma/adapter-pg` driver adapter. |
| `UPLOAD_DIR` | No | `uploads` | Where submitted files are written, relative to the repo root. Gitignored. |
| `MAX_UPLOAD_BYTES` | No | `10485760` (10 MB) | Rejection threshold for uploads. |

No credentials are committed. `.env` is gitignored; `.env.example` is the file to copy.

---

## Trying it out

There is no login — the brief allows a role toggle, so the sidebar has a
**Viewing as** switcher: *Registry staff*, or any student. The choice is stored
in an httpOnly cookie and read **server-side**, which is the part that matters:
switching to a student does not hide staff data, it stops fetching it.

The seed plants one of every edge case, so the interesting things are visible on
the first screen:

| Student | What they demonstrate |
| --- | --- |
| **Ben Whitfield** | Part payment against an overdue instalment → **in arrears**, plus a **late** submission |
| **Chloe Ferreira** | Nothing paid at all — the largest arrears on the dashboard |
| **Elena Kovac** | Sponsor overpaid → **in credit**, not a negative debt |
| **Farhan Iqbal** | **Withdrawn** but still owing — still chased, and blocked from new charges |
| **Hassan Ali** | A **withheld** fail (34) and a **resubmission** (attempt 2) |
| **Grace Lin** | **Completed**, fully settled, results published |

A five-minute tour:

1. **Today** — the dashboard leads with arrears, unmarked scripts, withheld
   results and late submissions. Headcount is at the bottom, where it belongs.
2. **Assessments → Coursework 1** — the marking sheet. Note that students with
   *no* submission still have a row, and that saving a mark does not release it.
3. Switch to **Hassan Ali**. His 34 is nowhere on the page — and nowhere in the
   HTML either. He sees "handed in, not yet released" instead of silence.
4. Switch back to staff, publish his mark, switch back. Now it is there.
5. As a student, **My work** → upload a PDF to an open assessment, then upload
   again: it replaces the first. Try it on a closed one and it is refused.

---

## Decisions, and why

The brief said it cares more about how you think than how much you build. These
are the choices I would want to defend in a review.

### A balance is derived, never stored

`FeeCharge` and `Payment` are separate tables and the balance is always
`sum(charges) − sum(payments)`, computed in `src/lib/fees.ts`. A stored balance
is a cache, and caches drift. The first time a Registry team finds a balance
column that disagrees with the ledger, they stop trusting the system and go back
to a spreadsheet.

### "Owing" and "in arrears" are different questions

Most students owe money for most of the year — that is how instalments work.
Flagging everyone with a balance would produce a chase list containing the whole
register, which is the same as no chase list.

So **overdue** means: there is an outstanding balance **and** at least one charge
is already past its due date. Payments are applied oldest-charge-first, the way a
bursary office actually allocates them, so a part payment clears the oldest debt
and only the genuine shortfall shows as arrears. One colour — oxblood — is
reserved for exactly this, used nowhere else in the interface.

### Withheld results are not fetched, not hidden

`getStudentMarksheet` filters `published: true` in the query. An unpublished mark
never enters the process, so it cannot leak through a serialised prop, a client
bundle, or a log line. Hiding it in the component would have looked identical and
been wrong.

The same reasoning covers files: `GET /api/submissions/[id]/file` checks that a
student owns the submission before serving it, and returns **404 rather than 403**
so the response does not confirm that someone else's file exists.

### Re-marking un-publishes

If staff change a mark that has already been released, `saveGrade` sets
`published: false` again. Someone has to decide, deliberately, that the student
should see the new number. Silently updating a published result is how a student
finds out their grade changed by refreshing a page.

### Late work is accepted and flagged, not refused

Refusing a late upload leaves the student with no record at all, which helps
nobody — the board needs the work *and* the fact that it was late. `isLate` is
stamped at write time against the deadline as it stood then, so moving a deadline
later cannot retroactively forgive someone who missed the original.

Resubmission is the mirror image: open until the deadline, closed after it.
Otherwise the deadline means nothing.

### Uploads are checked by content, not by their name

`identifyUpload` requires the extension **and** the magic bytes to agree. A
`Content-Type` header is a claim made by the client, not evidence. Stored
filenames are generated from our own record id — a client-supplied filename is an
attacker-supplied path — and every read re-checks that the resolved path is still
inside the upload directory.

### Student IDs come from a counter table

`SMS-2026-0001` is read out over the phone, so it has to be sequential and
year-scoped rather than random. That makes it a shared-counter problem:
`allocateStudentId` increments a row inside the caller's transaction, taking a
row lock. `MAX(id) + 1` would race, and would reuse a number after a deletion —
a number that may already be printed on a student card.

### Enrolling raises the tuition charge

Registry should not have to remember to bill a student they have just admitted. A
student with no charge is invisible to the whole fees process, which is the kind
of gap that surfaces in month three.

### A deadline is a time on the institution's clock

`<input type="datetime-local">` submits a naive wall-clock string with no zone.
Passing that to `new Date()` interprets it in whatever timezone the *server*
runs in — so a registrar typing a 17:00 deadline got 11:00 when the server ran
in Asia/Dhaka, and something else again on a different host. Deadlines decide
whether work is late, so `src/lib/time.ts` pins the zone down explicitly, in
both directions: instants are parsed and displayed on the institution's clock,
while date-only columns (dates of birth, due dates) stay in UTC so they cannot
shift a day.

### Money is `Decimal(10,2)`, never a float

Summing `0.1` three times in JavaScript gives `0.30000000000000004`. A fees ledger
that cannot be reconciled against a bank statement to the penny is not a fees
ledger. There is a test for exactly this.

### Defence in depth at the database

Application validation (Zod) is the useful layer, but a second migration adds
`CHECK` constraints for score range, positive amounts and sensible academic
years. A bad script or a manual `UPDATE` should not be able to talk its way past
the rules.

---

## How it is put together

```
prisma/
  schema.prisma          the data model, commented with the reasoning
  migrations/            init, then the CHECK constraints
  seed.ts                demo data — one of every edge case

src/lib/                 rules, with no framework in them
  fees.ts                balance and arrears derivation      ← tested
  submissions.ts         late / resubmission / file identity ← tested
  grading.ts             classification bands                ← tested
  student-id.ts          atomic ID allocation                ← tested
  session.ts             the role toggle, read server-side
  storage.ts             file storage, path-escape guarded
  validation.ts          Zod schemas for every mutation

src/server/
  queries.ts             the read model — one place per rule
  actions.ts             mutations, each re-checking role and input

src/app/                 staff pages, /me/* student pages, two API routes
src/components/          UI primitives and forms
```

The rules live in `src/lib` as plain functions with no database or React in
them, which is why they can be unit-tested without a running Postgres. Both
Server Actions and API routes call the *same* functions — there is one
implementation of "is this late", not two that can drift apart.

### On the interface

It is styled as a records office rather than a SaaS dashboard: ink-on-paper,
ruled tables with no zebra striping, and Spectral / IBM Plex Sans / IBM Plex Mono
doing three distinct jobs. Controls are shadcn/ui-shaped — Radix primitives with
this project's own tokens rather than shadcn's default palette — which is what
`src/components/select.tsx` is: the same component structure shadcn ships, over
`@radix-ui/react-select`. Anything a person reads off the screen and types into
another system — student IDs, payment references, amounts, dates — is set in
mono so the columns align and digits cannot be misread. Statuses are rendered as
**stamps**, because a paper student file is stamped, and because it lets a dense
table carry state without shouting.

---

## How I used AI

I built this with **Claude Code (Opus)**, working in an agentic loop: I set the
direction and made the product decisions, the model wrote most of the code, and I
reviewed everything that went in. That is the honest description — not "AI
assisted with some boilerplate".

**Where it did the heavy lifting**

- **Scaffolding and schema drafting.** The first pass at `schema.prisma`, the
  Prisma 7 configuration, the Tailwind token layer and the UI primitives were all
  generated. Fast, and largely right.
- **The seed script.** Writing eight students whose fee positions, submissions and
  marks each demonstrate a different edge case is exactly the sort of fiddly,
  high-volume work that is worth delegating.
- **Repetitive page structure.** Once one table page existed, the rest followed
  the pattern quickly.
- **Tests.** I described the behaviour I wanted pinned down — oldest-charge-first
  allocation, a renamed `.exe`, the pass mark being inclusive at 40 — and the
  cases were written from that.

**Where I had to steer, and where it was wrong**

- `npm install prisma@latest` resolved to an **8.0 release candidate** against a
  7.x client. Silent version skew that would have failed confusingly later; I
  pinned both to 7.
- Prisma 7 **requires a driver adapter** and no longer accepts `url` in the
  schema's datasource. The first attempt used the v5/v6 shape and did not
  validate. I checked the current docs rather than trusting the model's memory —
  worth remembering that a model's training data lags a major release.
- Exporting a plain constant from a `"use server"` file **crashes at runtime**,
  not at build. Caught it by clicking through the app, then split
  `action-state.ts` out.
- React 19's purity lint rejected `Date.now()` during render. The fix was right in
  substance as well as form: "is this charge overdue" is a question about the
  data, so it moved into the query layer.
- **The interesting product decisions were mine.** Deriving the balance rather
  than storing it; separating "owing" from "in arrears"; re-marking
  un-publishing; showing students "not yet released" instead of nothing;
  returning 404 rather than 403 on someone else's file. Asked for "a fees page",
  a model will give you a `balance` column and a red badge on anyone above zero.

**Where a review caught something I had not**

An automated security review over the pushed commits flagged two real problems
in the file-download route, both of which I had written and not spotted:

- The response echoed the **uploader's own `Content-Type`** back with an
  `inline` disposition. A student could upload a genuine PDF while claiming
  `text/html`, and every marker who opened it would execute their script on our
  origin — stored XSS. The type is now derived from the extension of the name
  *we* generated, with `nosniff` and a `default-src 'none'; sandbox` CSP behind
  it.
- The student's filename went into the `Content-Disposition` header with only
  non-printable characters stripped. A quote survives that, closes the quoted
  value, and lets the uploader append header parameters of their choosing.
  `safeHeaderFilename` now handles it, with five test cases pinning it down.

I re-ran the attack against the running app to confirm the fix rather than
assuming it: a PDF uploaded as `text/html` now comes back as `application/pdf`.
Worth being plain about — a model wrote that route, I reviewed it and missed
both, and a second automated pass found them. Review layers are not redundant.

A deliberate bug-hunting pass afterwards turned up three more, all of the same
character — code that looked obviously correct and was not:

- **The timezone bug above.** Reproduced by typing a 17:00 deadline and reading
  11:00 back off the page.
- **Dates parsed by string concatenation.** `paidAt + "T12:00:00Z"` produced an
  Invalid Date for anything that was not exactly `YYYY-MM-DD`, and the schema
  had been permissive enough to let a full ISO timestamp through. The schemas
  are now strict about the shape and `lib/time.ts` owns the parse.
- **The upload wrote the database row before the file.** If the disk write
  failed on a resubmission, the row took the new filename, size and timestamp
  while `storedName` still pointed at the previous attempt — the student saw
  one file and the marker downloaded another, and the error message claimed
  nothing had been recorded. The file is now written first, under a random
  name, and the row only follows once the bytes are safely down.

Plus a one-month due date that rolled 31 January to 3 March, and a summary line
that was the one place in the codebase quietly adding money as floats.

**How I verified it**, rather than assuming

I drove the running app with Playwright and `curl` instead of trusting that it
compiled: uploaded a real PDF, a DOCX, and a text file renamed `.pdf`; resubmitted
before and after a deadline; tried to upload as staff; downloaded another
student's file while acting as a student; and grepped the student's rendered HTML
for the withheld mark and its feedback text to confirm neither appears. All of
those are in the commit history as the behaviour they produced.

---

## What I would do next

In rough priority order, with more than a few days:

1. **Real authentication.** `src/lib/session.ts` is the only thing that would
   change — every query already derives its filters from it.
2. **An audit trail.** Who published a result, who reversed a payment, when. A
   Registry system is asked to prove what it did; right now `updatedAt` is all
   there is.
3. **Payments allocated explicitly to charges.** Oldest-first is a good default,
   but a bursary office sometimes needs to say *this receipt settles that
   charge*.
4. **Object storage for submissions.** Local disk is deliberate — it runs
   anywhere with no cloud account — but it will not survive a serverless deploy.
   `src/lib/storage.ts` is the only file that has to change.
5. **Bulk mark entry**, and CSV export of a marksheet. Both are what markers ask
   for within a week of using a screen like this.
6. **Notifications on publication**, so students are not refreshing a page.
