# Registry — Student Management System

The four jobs the brief asks for — **signing students up**, **fees and
payments**, **handing work in**, and **marks and results** — given to the three
people who actually do them. The **office** signs students up and handles money.
**Teachers** set work, mark it, and decide when a student sees the result. Each
**student** sees only their own record. The office cannot release a mark, and a
teacher cannot see the money.

**Next.js (App Router) · PostgreSQL · Prisma · Tailwind + shadcn/ui · TanStack Table · Vitest**

Why each decision was made — and what I got wrong along the way — is in
**[NOTES.md](NOTES.md)**.

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
| `DATABASE_URL` | Yes | — | Where your PostgreSQL database is. The only thing you have to set. |
| `UPLOAD_DIR` | No | `uploads` | Folder for files students hand in. Not committed to git. |
| `MAX_UPLOAD_BYTES` | No | `10485760` (10 MB) | Largest file accepted. |

No credentials are committed: `.env` is gitignored, `.env.example` is the file
to copy.

---

## Trying it out

There is no login. The sidebar has a **You are viewing this as** switcher — the
office, any teacher, or any student. The app checks who you are on the server,
so switching does not just hide the other person's data, it never loads it.

The demo data has one example of every tricky case. A five-minute tour:

1. **Today** (as the office) — it opens with who owes money and is late paying,
   not with a headcount. There is no marking to do here: the office cannot mark.
2. As **Dr Priya Raman** → **Coursework 1**. You see all five students the work
   was set for, including the two who handed in nothing. Typing a mark saves it
   when you tab out, but does not show it to the student yet.
3. As **Hassan Ali** — his held-back 34 is nowhere on the page, and not in the
   page source either. He is told his work was received but not marked yet,
   which beats silence. The MSc essay is not listed at all: it was never his.
4. Go back to Dr Raman, release the mark, return to Hassan. Now it is there.
5. As **Dr Martin Cole**, open Coursework 1's link directly — page not found. He
   did not set it, so its marks are never loaded. Same for the file download.
6. As a student, **My work** → upload a PDF, upload again (it replaces the
   first), then try one whose deadline has passed (refused).

Others worth a look: **Ben Whitfield** (paid part of a late bill, and handed
work in late), **Elena Kovac** (overpaid, so she is in credit rather than in
debt), **Farhan Iqbal** (left the course but still owes money), **Grace Lin**
(finished, paid up, results out).

---

## The decisions that matter

- **The balance is always added up, never saved.** Bills minus payments, every
  time. A saved total is a copy, and copies go out of date.
- **Owing money is not the same as being late.** Nearly everyone owes something
  during the year — that is how instalments work. A student is only flagged when
  a bill has actually passed its due date. Payments clear the oldest bill first,
  the way a finance office does it.
- **Three roles, because there are three jobs.** The office handles students and
  money, teachers handle work and marks, students see their own record. It is
  enforced on the server three times over, so guessing a web address gets you
  nothing.
- **Work is set for one class, not the whole school.** Each assessment belongs
  to a course and to the teacher who set it. "You did not hand this in" and
  "this was never yours to do" look the same on screen and mean very different
  things.
- **A held-back mark is never sent to the browser.** It is filtered out in the
  database, not hidden with CSS. Asking for someone else's file gives "not
  found" rather than "not allowed", so you cannot even confirm it exists.
- **Changing a mark hides it again.** Someone has to decide, on purpose, that
  the student should see the new number.
- **Late work is accepted and flagged, not refused.** The school needs the work
  *and* the fact it was late. It is stamped at the time, so moving a deadline
  later cannot quietly let someone off.
- **Uploaded files are checked by what is inside them**, not by their name. An
  `.exe` renamed `.pdf` is rejected.
- **Student numbers come from a counter**, so two people enrolling at once can
  never get the same one, and a number is never handed out twice.
- **A deadline is a time on the school's clock**, fixed explicitly — otherwise a
  5pm deadline becomes 11am on a server in another country.
- **Money is stored as exact decimals, never as floating point.** There is a
  test for it: computers get `0.1 + 0.1 + 0.1` wrong, and the fee records have to
  match the bank to the penny.

The rules live in `src/lib` as plain functions, so they can be tested on their
own, and every part of the app calls the same one — there is one answer to "is
this late", not two that can disagree.

---

## How I used AI

I used **Claude Code (Opus)**. It wrote most of the code; I decided what to
build, and I checked everything before it went in.

**Good at:** setup, the first draft of the database, the demo data, repeated
pages, and tests once I described the rule I wanted held.

**Got wrong, and I had to catch it:**

- It installed the wrong major version of two libraries, twice. Now pinned.
- It gave every teacher and every office worker the same powers. The brief says
  the office handles students and fees, and teachers handle marks. I had to
  split it properly.
- It made up its own grading bands instead of the ones in the brief.
- The first design looked like every AI-made site. I rebuilt the layout, not
  just the colours.
- It left two security holes in the file download, both found by a review pass
  and fixed.

**I tested by using the app,** not by trusting that it compiled: uploaded files,
handed work in late, and tried to open another student's file to make sure I
could not.

The longer version, with every bug and why it happened, is in
[NOTES.md](NOTES.md).

---

## What I would do next

Proper logins (one file changes) · a history of who did what, and when · letting
the office point a payment at a specific bill · storing files in the cloud
instead of on disk · entering lots of marks at once, and a CSV export · a hold
the office can put on a record, so a teacher is never the one sitting on a mark
because of an unpaid bill.
