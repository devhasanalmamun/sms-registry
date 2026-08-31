# Registry — Student Management System

The Registry module: **enrolment**, **fees and payments**, **assessment
submission**, and **marksheet and results** — split across the three people who
actually do them. Enrolment and money belong to the **Registry office**;
assessments, marking and releasing results belong to **teaching staff**; the
**student** sees their own record. A registrar cannot release a mark and a
lecturer cannot see the ledger.

**Next.js (App Router) · PostgreSQL · Prisma · Tailwind + shadcn/ui · TanStack Table · Vitest**

The reasoning behind every decision below — and the honest account of what I got
wrong — is in **[NOTES.md](NOTES.md)**.

---

## Running it locally

**Prerequisites:** Node 20+ and a PostgreSQL database.

```bash
git clone https://github.com/devhasanalmamun/sms-registry.git
cd sms-registry
npm install                 # also runs `prisma generate`

cp .env.example .env        # then point DATABASE_URL at your database
npm run db:migrate          # applies the migrations
npm run db:seed             # loads the demo data
npm run dev                 # http://localhost:3000
```

Any PostgreSQL works — local, Neon, Supabase, RDS. If you would rather not
install one, `npm run db:up` starts the included `postgres:16` container on port
5555, which is what `.env.example` already points at, so the sequence above then
needs no edits at all.

Other commands: `npm run build`, `npm test` (62 unit tests over the fee,
submission, date, grading and access rules), `npm run db:reset` (back to a clean
demo), `npm run db:studio`.

### Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Read by Prisma via `prisma.config.ts` and passed to the client through the `@prisma/adapter-pg` driver adapter. |
| `UPLOAD_DIR` | No | `uploads` | Where submitted files are written, relative to the repo root. Gitignored. |
| `MAX_UPLOAD_BYTES` | No | `10485760` (10 MB) | Rejection threshold for uploads. |

No credentials are committed: `.env` is gitignored, `.env.example` is the file
to copy.

---

## Trying it out

There is no login. The sidebar has a **You are viewing this as** switcher —
Registry office, any member of teaching staff, or any student. The choice is an
httpOnly cookie read **server-side**, so switching role does not hide the other
role's data, it stops fetching it.

The seed plants one of every edge case. A five-minute tour:

1. **Today** (as Registry) — the desk leads with arrears, not headcount. There
   is no marking queue here: Registry cannot act on one.
2. As **Dr Priya Raman** → **Coursework 1**. The sheet lists the five active BSc
   students the work was set for, including the two who submitted nothing.
   Saving a mark does not release it. Marks save on tab, not on a button.
3. As **Hassan Ali** — his withheld 34 is nowhere on the page and nowhere in the
   HTML. He sees "handed in, not yet released" rather than silence. The MSc
   essay is absent entirely: it was never set for him.
4. Publish it as Dr Raman, switch back, and it appears.
5. As **Dr Martin Cole**, open Coursework 1's URL directly — 404. He did not set
   it, so its marks are never loaded. Same for the file route.
6. As a student, **My work** → upload a PDF, upload again (it replaces the
   first), try a closed assessment (refused).

Others worth a look: **Ben Whitfield** (part payment → in arrears, plus late
work), **Elena Kovac** (sponsor overpaid → in credit, not a negative debt),
**Farhan Iqbal** (withdrawn but still owing), **Grace Lin** (completed and
settled).

---

## The decisions that matter

- **A balance is derived, never stored** — `sum(charges) − sum(payments)`. A
  stored balance is a cache, and caches drift.
- **"Owing" and "in arrears" are different questions.** Everyone owes something
  for most of the year. Overdue means a balance *and* a charge past its due
  date. Payments apply oldest-first, as a bursary office allocates them.
- **Three roles, because there are three jobs.** The brief's modules 1–2 say
  *the Registry team*; 3–4 say *staff*. Enforced in three places: page guards,
  Server Actions, and SQL filters — a Server Action is a public endpoint, so
  knowing an id must be worth nothing.
- **An assessment is set for a cohort**, not the institution: it carries a
  programme and an owner. "You did not submit" and "this was never set for you"
  look identical on screen and mean different things.
- **Withheld results are not fetched, not hidden.** The query filters
  `published: true`, so an unpublished mark never enters the process. File reads
  return **404, not 403**, so the response cannot confirm someone else's file.
- **Re-marking un-publishes.** Someone has to decide, deliberately, that the
  student should see the new number.
- **Late work is accepted and flagged, not refused** — the board needs the work
  *and* the fact it was late. `isLate` is stamped at write time, so moving a
  deadline cannot retroactively forgive anyone.
- **Uploads are checked by content**: extension and magic bytes must agree, and
  stored names are ours, not the client's.
- **Student IDs come from a counter table**, allocated under a row lock —
  `MAX(id) + 1` races, and reuses a number that may be printed on a card.
- **A deadline is a time on the institution's clock**, pinned explicitly, because
  a naive `datetime-local` string is read in the *server's* zone.
- **Money is `Decimal(10,2)`, never a float.** There is a test for it.

The rules live in `src/lib` as plain functions with no database or React in
them, so they are unit-tested without a running Postgres, and Server Actions and
API routes call the *same* function — there is one implementation of "is this
late", not two that can drift.

---

## How I used AI

I built this with **Claude Code (Opus)** in an agentic loop: I set the direction
and made the product decisions, the model wrote most of the code, and I reviewed
what went in. That is the honest description, not "AI assisted with boilerplate".

**It did the heavy lifting** on scaffolding, the first draft of the schema, the
seed script (eight students each demonstrating a different edge case is exactly
the fiddly high-volume work worth delegating), repetitive page structure, and
tests written from behaviour I described.

**Where it was wrong, and I had to steer:**

- **Version skew, twice.** `prisma@latest` pulled an 8.0 RC against a 7.x
  client; `@tanstack/react-table@latest` pulled v9, whose API the shadcn pattern
  is not written against. Pin the major and check what actually installed.
- **Prisma 7 needs a driver adapter** and no longer takes `url` in the
  datasource. The first attempt used the v5 shape — a model's training data lags
  a major release, so I read the current docs.
- **I read "Staff view" and modelled one role where there are two.** Registry
  ended up setting assessments and releasing marks. The brief had told me
  otherwise and I read past it; the fix was a new table, a three-state session,
  and every guard, query and action re-cut.
- **I invented the wrong grading scheme** — the UK honours ladder instead of the
  Pass/Merit/Distinction thresholds the brief states. A confident default in
  place of a stated requirement.
- **The first design was, in the reviewer's words, "AI slop"** — and it was. My
  first fix was a repaint of the same page architecture, which changed nothing.
  The second changed the structure.
- **An automated review found two real holes in code I had written and read**:
  the download route echoed the uploader's own `Content-Type` (stored XSS), and
  the uploader's filename reached a header where a quote could break out of it.
  Both fixed, both re-attacked against the running app to confirm.
- **Asked "so all fixes, no bugs?", I looked and found one.** The cohort rule
  was defined twice and the two disagreed, so a withdrawn student could be given
  a mark that appeared on no marking sheet. It now lives once, with a regression
  test.

**The product decisions were mine** — deriving the balance, separating owing
from arrears, re-marking un-publishing, showing students "not yet released"
instead of nothing, 404 rather than 403. Asked for "a fees page", a model gives
you a `balance` column and a red badge on anyone above zero.

**I verified rather than assumed:** drove the running app with Playwright and
`curl`, uploaded a text file renamed `.pdf`, resubmitted either side of a
deadline, downloaded another student's file, and grepped the rendered HTML for
the withheld mark to confirm it is not there.

Full account, including the bugs a deliberate hunting pass turned up, in
[NOTES.md](NOTES.md).

---

## What I would do next

Real authentication (`src/lib/session.ts` is the only file that changes) · an
audit trail of who published what · payments allocated explicitly to charges ·
object storage for submissions · bulk mark entry and CSV export · a
Registry-owned sanctions flag, since a lecturer should not be the one withholding
a result over unpaid fees.
