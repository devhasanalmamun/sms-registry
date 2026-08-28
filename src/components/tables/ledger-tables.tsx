"use client";

import { DataTable, type ColumnDef } from "@/components/data-table";
import { Code } from "@/components/registry";
import { formatMoney } from "@/lib/format";

/**
 * The two halves of a student's account: what was charged, and what came in.
 *
 * The same two tables serve staff on a student record and the student on their
 * own fees page — the columns are identical, and duplicating them would be two
 * places for a formatting decision to drift. Dates arrive pre-formatted with a
 * sortable timestamp beside them, because a date-only value read in the
 * viewer's timezone can move a day.
 */

export type ChargeRow = {
  id: string;
  description: string;
  due: string;
  dueMs: number;
  amount: number;
  pastDue: boolean;
};

export type PaymentRow = {
  id: string;
  reference: string;
  detail: string;
  received: string;
  receivedMs: number;
  amount: number;
};

const chargeColumns: ColumnDef<ChargeRow, unknown>[] = [
  { accessorKey: "description", header: "Description" },
  {
    accessorKey: "dueMs",
    header: "Due",
    cell: ({ row }) => (
      <span
        className={`font-mono text-xs ${row.original.pastDue ? "text-destructive" : "text-graphite"}`}
      >
        {row.original.due}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => formatMoney(row.original.amount),
    meta: { numeric: true },
  },
];

const paymentColumns: ColumnDef<PaymentRow, unknown>[] = [
  {
    accessorKey: "reference",
    header: "Reference",
    cell: ({ row }) => (
      <>
        <Code>{row.original.reference}</Code>
        <span className="block text-xs text-muted-foreground">
          {row.original.detail}
        </span>
      </>
    ),
  },
  {
    accessorKey: "receivedMs",
    header: "Received",
    cell: ({ row }) => row.original.received,
    meta: { cellClassName: "font-mono text-xs text-graphite" },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => formatMoney(row.original.amount),
    meta: { numeric: true, cellClassName: "text-clear" },
  },
];

export function ChargesTable({ rows }: { rows: ChargeRow[] }) {
  return (
    <DataTable
      columns={chargeColumns}
      data={rows}
      mark={(r) => (r.pastDue ? { tone: "flag", label: "Overdue" } : null)}
      minWidth="0"
      initialSorting={[{ id: "dueMs", desc: false }]}
      caption="Charges raised"
    />
  );
}

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  return (
    <DataTable
      columns={paymentColumns}
      data={rows}
      minWidth="0"
      initialSorting={[{ id: "receivedMs", desc: true }]}
      caption="Payments received"
    />
  );
}
