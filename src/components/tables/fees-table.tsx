"use client";

import Link from "next/link";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { Code } from "@/components/registry";
import { StatusStamp } from "@/components/status-stamp";
import { formatMoney } from "@/lib/format";

/**
 * The fees ledger.
 *
 * Sorting matters more here than anywhere else in the Registry: the bursary's
 * working question is "who is furthest behind", and that is one click on the
 * Overdue column rather than a differently-filtered URL.
 */
export type FeeRow = {
  id: string;
  studentId: string;
  fullName: string;
  programmeCode: string;
  status: EnrolmentStatus;
  nextDue: string | null;
  charged: number;
  paid: number;
  balance: number;
  overdueAmount: number;
  isOverdue: boolean;
  inCredit: boolean;
};

const columns: ColumnDef<FeeRow, unknown>[] = [
  {
    accessorKey: "fullName",
    header: "Student",
    cell: ({ row }) => (
      <>
        <Link
          href={`/students/${row.original.id}`}
          className="font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
        >
          {row.original.fullName}
        </Link>
        <Code className="ml-2">{row.original.studentId}</Code>
        <span className="block text-xs text-muted-foreground">
          {row.original.programmeCode}
        </span>
      </>
    ),
  },
  {
    accessorKey: "status",
    header: "Standing",
    enableSorting: false,
    cell: ({ row }) => <StatusStamp status={row.original.status} />,
  },
  {
    id: "nextDue",
    header: "Next due",
    // Sort by the underlying instant, not by "22 Jul 2026" as text.
    accessorFn: (row) => (row.nextDue ? Date.parse(row.nextDue) : Infinity),
    cell: ({ row }) => row.original.nextDue ?? "—",
    meta: { cellClassName: "font-mono text-xs text-graphite" },
  },
  {
    accessorKey: "charged",
    header: "Charged",
    cell: ({ row }) => formatMoney(row.original.charged),
    meta: { numeric: true, cellClassName: "text-graphite" },
  },
  {
    accessorKey: "paid",
    header: "Received",
    cell: ({ row }) => formatMoney(row.original.paid),
    meta: { numeric: true, cellClassName: "text-clear" },
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => (
      <span className={row.original.inCredit ? "text-watch" : ""}>
        {formatMoney(row.original.balance)}
      </span>
    ),
    meta: { numeric: true },
  },
  {
    accessorKey: "overdueAmount",
    header: "Overdue",
    cell: ({ row }) => (
      <span
        className={
          row.original.isOverdue
            ? "font-medium text-destructive"
            : "text-muted-foreground"
        }
      >
        {row.original.isOverdue ? formatMoney(row.original.overdueAmount) : "—"}
      </span>
    ),
    meta: { numeric: true },
  },
];

export function FeesTable({ rows }: { rows: FeeRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      mark={(r) =>
        r.isOverdue
          ? { tone: "flag", label: "Past a due date" }
          : r.inCredit
            ? { tone: "watch", label: "In credit" }
            : null
      }
      minWidth="58rem"
      caption="Fee accounts"
    />
  );
}
