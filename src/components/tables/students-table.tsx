"use client";

import Link from "next/link";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { Code } from "@/components/registry";
import { StatusStamp } from "@/components/status-stamp";
import { formatMoney } from "@/lib/format";

/**
 * The register, as a data table.
 *
 * Money arrives as a number rather than a Decimal: it has already been summed
 * with Decimal arithmetic on the server, and this side only sorts and prints
 * it. Nothing here does arithmetic on it.
 */
export type StudentRow = {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  programmeCode: string;
  programmeName: string;
  academicYear: number;
  status: EnrolmentStatus;
  balance: number;
  isOverdue: boolean;
  inCredit: boolean;
};

const columns: ColumnDef<StudentRow, unknown>[] = [
  {
    accessorKey: "studentId",
    header: "Student ID",
    cell: ({ row }) => <Code>{row.original.studentId}</Code>,
  },
  {
    accessorKey: "fullName",
    header: "Name",
    cell: ({ row }) => (
      <>
        <Link
          href={`/students/${row.original.id}`}
          className="font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
        >
          {row.original.fullName}
        </Link>
        <span className="block text-xs text-muted-foreground">
          {row.original.email}
        </span>
      </>
    ),
  },
  {
    accessorKey: "programmeCode",
    header: "Programme",
    cell: ({ row }) => (
      <>
        <span className="font-mono text-xs">{row.original.programmeCode}</span>
        <span className="block text-xs text-muted-foreground">
          {row.original.programmeName}
        </span>
      </>
    ),
    meta: { cellClassName: "text-graphite" },
  },
  {
    accessorKey: "academicYear",
    header: "Year",
    meta: { numeric: true, cellClassName: "text-graphite" },
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => <StatusStamp status={row.original.status} />,
  },
  {
    accessorKey: "balance",
    header: "Balance",
    meta: { numeric: true },
    cell: ({ row }) => (
      <span
        className={
          row.original.isOverdue
            ? "font-medium text-destructive"
            : row.original.balance <= 0
              ? "text-clear"
              : "text-graphite"
        }
      >
        {formatMoney(row.original.balance)}
      </span>
    ),
  },
];

export function StudentsTable({ rows }: { rows: StudentRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      mark={(r) =>
        r.isOverdue
          ? { tone: "flag", label: "In arrears" }
          : r.inCredit
            ? { tone: "watch", label: "In credit" }
            : null
      }
      caption="Students on the register"
    />
  );
}
