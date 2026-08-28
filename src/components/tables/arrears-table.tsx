"use client";

import Link from "next/link";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { Code, Stamp } from "@/components/registry";
import { formatMoney } from "@/lib/format";

/**
 * The chase list on the Registry desk: accounts past a due date, worst first.
 *
 * Only a status that changes what Registry may do about the debt is stamped
 * here. "Enrolled" is the expected state and would be noise on a list whose
 * whole job is to be scanned.
 */
export type ArrearsRow = {
  id: string;
  studentId: string;
  fullName: string;
  programmeCode: string;
  status: EnrolmentStatus;
  overdueAmount: number;
  balance: number;
};

const columns: ColumnDef<ArrearsRow, unknown>[] = [
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
      </>
    ),
  },
  {
    accessorKey: "programmeCode",
    header: "Programme",
    meta: { cellClassName: "text-graphite" },
  },
  {
    accessorKey: "status",
    header: "Standing",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.status === "WITHDRAWN" ? (
        <Stamp tone="neutral">Withdrawn</Stamp>
      ) : row.original.status === "DEFERRED" ? (
        <Stamp tone="neutral">Deferred</Stamp>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "overdueAmount",
    header: "Overdue",
    cell: ({ row }) => formatMoney(row.original.overdueAmount),
    meta: { numeric: true, cellClassName: "font-medium text-destructive" },
  },
  {
    accessorKey: "balance",
    header: "Total balance",
    cell: ({ row }) => formatMoney(row.original.balance),
    meta: { numeric: true, cellClassName: "text-graphite" },
  },
];

export function ArrearsTable({ rows }: { rows: ArrearsRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      initialSorting={[{ id: "overdueAmount", desc: true }]}
      caption="Accounts in arrears"
    />
  );
}
