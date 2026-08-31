# Registry — Student Management System

The Registry module of a student management system: the four workflows the brief
sets out — **enrolment**, **fees and payments**, **assessment submission**, and
**marksheet and results** — split across the three people who actually do them.

Enrolment and money belong to the **Registry office**. Assessments, marking, and
deciding which results a student may see belong to **teaching staff**. The
**student** sees their own record. These are separate jobs with separate
authority, and the app models them that way: a registrar cannot set an
assessment or release a mark, and a lecturer cannot see the fees ledger.

Built with **Next.js (App Router)**, **PostgreSQL**, **Prisma**, **shadcn/ui** and **TanStack Table**.

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
npm run db:up               # docker compose up -d — postgres:16 on port 5555
```

The `.env.example` connection string already matches that container, so with
Docker the sequence above works with no edits at all.

### Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | 62 unit tests (Vitest) over the fee, submission, date, grading and access rules |
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
**You are viewing this as** switcher offering the Registry office, any member of
teaching staff, or any student. The choice is stored in an httpOnly cookie and
read **server-side**, which is the part that matters: switching role does not
hide the other role's data, it stops fetching it.

| Role | Can | Cannot |
| --- | --- | --- |
| **Registry office** | Enrol and amend students, raise charges, record payments, chase arrears | Set assessments, enter marks, release results, open a submitted file |
| **Teaching staff** | Set assessments for a cohort, read the work handed in, enter marks, publish or withhold **per student** | See the fees ledger, enrol anybody, touch another lecturer's assessment |
| **Student** | Their own results, submissions, and fees | Anything belonging to anybody else |

Teaching staff seeded: **Dr Priya Raman** (two BSc assessments), **Dr Martin
Cole** (one MSc assessment), and **Professor Ines Bauer**, who has set nothing —
because the empty state is a screen a new lecturer really sees.

The seed plants one of every edge case, so the interesting things are visible on
the first screen:

| Student | What they demonstrate |
| --- | --- |
| **Ben Whitfield** | Part payment against an overdue instalment → **in arrears**, plus a **late** submission |
| **Chloe Ferreira** | Nothing paid at all — the largest arrears on the dashboard |
| **Elena Kovac** | Sponsor overpaid → **in credit**, not a negative debt |
| **Farhan Iqbal** | **Withdrawn** but still owing — still chased, and blocked from new charges |
| **Hassan Ali** | A **withheld** fail (34) and a **resubmission** (attempt 2) |
| **Chloe & Elena** | On the MSc — so the BSc coursework is not merely closed to them, it is invisible |
| **Grace Lin** | **Completed**, fully settled, results published |

A five-minute tour:

1. **Today** (as Registry) — the desk leads with arrears. Headcount is at the
   bottom, where it belongs. There is no marking queue here: Registry cannot
   act on one.
2. Switch to **Dr Priya Raman** → **My assessments**, then **Coursework 1**.
   The marking sheet lists the five active BSc students the work was set for —
   including the two who submitted nothing, because a blank row is the most
   useful thing on the screen. Saving a mark does not release it.
3. Switch to **Hassan Ali**. His 34 is nowhere on the page — and nowhere in the
   HTML either. He sees "handed in, not yet released" instead of silence. Note
   also that the MSc essay is absent entirely: it was never set for him.
4. Switch back to Dr Raman, publish his mark, switch back. Now it is there.
5. Switch to **Dr Martin Cole** and try Coursework 1's URL directly. It 404s —
   he did not set it, so its marks are never loaded. Same for the file route.
6. As a student, **My work** → upload a PDF to an open assessment, then upload
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

### Three roles, because there are three jobs

The brief allows "a Staff view and a Student view", and my first pass took that
literally: one `staff` flag guarding enrolment, fees, marking and publishing
alike. That models an institution where the person chasing an unpaid instalment
also decides who passed, which is not one I have ever seen.

So the flag became three roles, and the split follows the brief's own wording —
modules 1 and 2 say *"the Registry team"*, modules 3 and 4 say *"staff creates
an assessment"* and *"staff can publish or withhold results per student"*:

* **Registry office** — enrolment and the fees ledger.
* **Teaching staff** — assessments, marking, and releasing results.
* **Student** — their own record.

They are enforced in three places, deliberately: `lib/guards.ts` redirects a
page, `lib/session.ts` gates every Server Action, and the queries in
`server/queries.ts` filter in SQL. A Server Action is a public endpoint, so
knowing an id has to be worth nothing on its own.

One consequence is worth stating plainly, because it cuts against a feature I
had liked: **withholding a result over unpaid fees is no longer modellable.**
The only person who can withhold is now the lecturer, and lecturers cannot see
the ledger. That is what the brief asks for, and it is defensible — academic
judgement should not be a debt-collection lever — but it is a real trade-off
rather than an oversight. A real institution would handle it with a separate
sanctions flag owned by Registry, which is out of scope here.

### An assessment is set for a cohort, not for everybody

`Assessment` carries a `programmeId` and a `createdById`. Before, every
assessment was global: an MSc student saw the BSc coursework sitting there
unsubmitted, and the marking sheet listed every student in the institution
whether or not the work was set for them.

Now an assessment reaches exactly the students on its programme, and the marking
sheet lists exactly that cohort. The distinction matters because "you have not
submitted" and "this was never set for you" look identical on a screen and mean
completely different things.

Ownership is the same idea applied to staff: `createdById` is checked inside the
query that fetches the assessment, so a lecturer opening a colleague's marking
sheet gets a 404 having loaded none of its marks.

### The classification is the institution's, not the one I assumed

`classify()` returns **Distinction ≥ 70, Merit ≥ 60, Pass ≥ 40, Fail below**.

I originally wrote it as the UK honours ladder — 1st / 2:1 / 2:2 / 3rd — because
that is what "classification" usually means for a degree. It is the wrong scheme
for these regulations, and it invents a band at 50 that they do not recognise.
The band is derived from the stored mark rather than stored beside it, so
correcting the policy was a change to one function and its tests, not a data
migration.

### Withheld results are not fetched, not hidden

`getStudentMarksheet` filters `published: true` in the query. An unpublished mark
never enters the process, so it cannot leak through a serialised prop, a client
bundle, or a log line. Hiding it in the component would have looked identical and
been wrong.

The same reasoning covers files. `GET /api/submissions/[id]/file` asks
`canReadSubmission` (in `src/lib/access.ts`, unit-tested): a student may read
their own work, a lecturer may read work handed in for an assessment they set,
and the Registry office may read none of it. It returns **404 rather than 403**,
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
  session.ts             the three roles, read server-side
  access.ts              who may read what                   ← tested
  storage.ts             file storage, path-escape guarded
  validation.ts          Zod schemas for every mutation

src/server/
  queries.ts             the read model — one place per rule
  actions.ts             mutations, each re-checking role and input

src/app/                 registry pages, /assessments/* teaching, /me/* student,
                         and two API routes
src/components/ui/       shadcn/ui, as generated — not hand-edited
src/components/          the Registry layer composed on it, plus the forms
src/components/tables/   one column definition per table, over TanStack
```

The rules live in `src/lib` as plain functions with no database or React in
them, which is why they can be unit-tested without a running Postgres. Both
Server Actions and API routes call the *same* functions — there is one
implementation of "is this late", not two that can drift apart.

### On the interface

The component layer is **shadcn/ui**, installed with the CLI (`components.json`
is committed). Everything under `src/components/ui` is exactly what the registry
generated and is left alone so it can be updated; `src/components/registry.tsx`
is the layer above, where this domain's compositions live.

The reference is the printed student register — the banded "greenbar" paper
university registries ran marksheets and fee ledgers off onto, and the ruled
official forms around it. Four rules follow from that, and each is there for the
reader rather than for the look:

- **The page is one sheet.** Sections are divided by a rule and a heading, not
  stacked into cards. A screen of boxes inside boxes makes somebody work out the
  nesting before they can read anything.
- **Banded rows.** A fee row is eight columns wide and the eye loses its place
  halfway across. Greenbar paper solved that in 1965 and it still works.
- **Exceptions are named, not coded.** Rows that need chasing say "In arrears",
  "Late", "Withheld" in an Attention column. An earlier version marked them with
  a coloured bar in a blank margin, which looked considered and was unreadable:
  nobody learns what a red bar means from a tooltip.
- **Nothing is filled with black.** Weight comes from rules and from one house
  colour — a stamp blue that marks the primary action and the section you are
  in, and does nothing else, so "blue means you can act on it" stays true.

Beside it are three signal colours and no others: **flag** (money past its due
date, a mark withheld), **watch** (late work, a deadline closing) and **clear**
(settled, published, in good standing). `destructive` is wired to `flag`, so a
destructive button lands on the right colour by construction.

None of this forks a shadcn component. It is done in `globals.css`, by giving
shadcn's own semantic tokens registry values:

| shadcn token | Registry value |
| --- | --- |
| `background` / `card` | the sheet |
| `foreground` | ink |
| `primary` | stamp blue |
| `destructive` | flag |
| `muted` | the band |
| `border` / `input` | the two weights of ruling |
| `radius` | effectively square |

**Type** does three jobs. Archivo, run wide and heavy, is the masthead and the
page title — the lettering of a form header. Public Sans, drawn for US federal
government forms, is interface text. Spline Sans Mono carries anything read off
the screen and typed into another system: student numbers, payment references,
amounts, dates. One rule holds it together: **small mono capitals label a
column, and nothing else** — not page eyebrows, not field labels, not row
counts. A field label is sentence case and quiet, because a label's job is to
get out of the way.

**Orientation** is treated as a feature, not a nicety. The role selector sits at
the foot of the margin, under a rule, where a form puts its signature block — and
because the margin is sticky and the selector pinned to its bottom edge, it is on
screen at every scroll position rather than only at the top of a long list. Every
nav entry carries its description, not just the
active one. Detail screens open with a route back. And where the domain has a
distinction a reader cannot guess — "owing" is not "in arrears" — the screen
says so next to the figures rather than assuming it.

Nothing in the app reloads the document. Switching role, saving a mark and
releasing a result are all Server Actions, and navigation is client-side — but
every route is dynamic with no `loading.tsx`, so a click holds the previous
screen for the length of a database round trip. Without feedback that reads as a
freeze followed by a reload, so every action says it is working: submit buttons
disable and change label through `useFormStatus`, and nav links show a pending
rule through `useLinkStatus`. Verified by sampling the DOM during the action
rather than by watching it, since on a warm dev server the round trip is often
under 150 ms and the state is easy to miss.

Every table is **TanStack Table** driving the shadcn `Table` primitives — the
shadcn data-table pattern. `src/components/data-table.tsx` is the shared shell
and each file in `src/components/tables/` is one set of column definitions.
Registry and teaching staff both re-sort constantly, and always by the column in front of them:
who owes the most, what is due first, which scripts are still unmarked. Those
lists are small enough to hold in the page, so sorting is client-side and the
server query stays responsible for *which* rows are in the list. Sorting state
is announced with `aria-sort`.

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
- **`@tanstack/react-table@latest` installed v9**, whose API is not the v8 the
  shadcn data-table pattern is written against — `createCoreRowModel`, a
  feature-typed `ColumnDef`, no `useReactTable`. The generated code was v8 and
  did not compile. Same lesson as the Prisma skew, twice in one project: pin the
  major, and check what actually got installed. Pinned to v8, which is what
  shadcn documents.
- **A visual bug I diagnosed that did not exist.** The rail's controls looked
  light-on-dark in a screenshot, and I had a plausible story about Chromium
  painting the native button face under `appearance: button`. Sampling the PNG
  pixels showed `rgb(40,49,60)` — correct all along. I reverted the "fix". Read
  the measurement, not the screenshot.
- **The first design was, in the user's words, "AI slop" — and it was.** Cream
  background, high-contrast serif display, hairline rules, zero radius, dense
  columns: two of the three looks current AI design converges on, stacked. Not a
  choice, a default I had arrived at without noticing.
- **My first attempt to fix it was a repaint, and the user said so.** New palette,
  new typefaces, same page architecture — so it still read as the same screen. The
  second pass changed the structure: cards became ruled sections of one sheet, the
  role selector was pinned where it stays reachable, coloured margin marks became
  a named Attention column, and every black fill came out. Worth recording because
  the failure mode is specific: I had treated "make it look different" as the task
  when the task was "make it read better".
- **I read "Staff view" and modelled one role where there are two.** The brief's
  role-separation line says "a Staff view and a Student view", and I built
  exactly that — so the Registry team created assessments and released marks.
  Modules 3 and 4 say *staff* set the work and publish the results, and modules 1
  and 2 say *the Registry team* handle enrolment and fees; the document had told
  me it was two different jobs and I had read past it. The user caught it. The
  fix was not cosmetic: a new table, two required columns, a three-state session,
  and every guard, query and Server Action re-cut around it.
- **I also invented the wrong grading scheme.** I wrote the UK honours ladder
  because that is what "classification" conventionally means, rather than the
  Pass/Merit/Distinction thresholds the brief specifies. A confident default in
  place of the stated requirement — the same failure as above, one line lower.
- **Publishing a result showed me a modelling gap in my own seed data.** Testing
  the release path end to end put the marker's internal note — "do not release
  before moderation" — straight onto the student's screen, because there is one
  `feedback` field and publishing shows it verbatim. The seed text was wrong for
  a student-facing field; I would not have noticed by reading the code.
- **Asked "so all fixes, no bugs?", I went and looked — and found one.** The
  marking sheet defined the cohort as programme *and* active status; `saveGrade`
  defined it as programme alone. A withdrawn student could therefore be given a
  mark that appeared on no marking sheet and on their own marksheet — the exact
  ghost the guard's comment claimed to prevent. Two definitions of one rule, in
  code I had written twenty minutes earlier and reviewed. It now lives once, in
  `src/lib/access.ts`, with a regression test. The test is also what moved it:
  the rule had been sitting behind `server-only`, where nothing could test it.
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
7. **A Registry-owned sanctions flag.** The role split means a lecturer can no
   longer withhold a result over unpaid fees, and should not be able to. If the
   institution genuinely wants that lever, it belongs to Registry as an explicit
   hold on a student's record that the marksheet reads — not as a lecturer
   quietly sitting on a mark.
8. **Teaching allocation.** A staff member can currently set work for any
   programme. A real timetable says who teaches which module to which cohort,
   and the programme picker should be constrained by it.
