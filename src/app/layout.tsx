import type { Metadata } from "next";
import { Archivo, Public_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

/*
 * Three faces, three jobs.
 *
 * The reference is the printed student register — the continuous-stationery
 * marksheets and fee ledgers university registries ran off line printers well
 * into this century, and the official forms that surround them. Not a book, and
 * not a magazine: a working document.
 *
 *   Archivo      — headings and the masthead, run wide and heavy. A grotesque
 *                  with the flat authority of signage and form headers, which is
 *                  what a register heading is. Never set as body copy.
 *   Public Sans  — interface text. Drawn for US federal government forms, so it
 *                  is legible at small sizes and has no personality to impose.
 *   Spline Mono  — everything read off the screen and typed into another system:
 *                  student IDs, payment references, amounts, dates. Also the
 *                  column headings, because those label a printed column.
 */

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Registry — Student Management System",
  description:
    "Enrolment, fees, submissions and results for the Registry office.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-GB"
      className={cn(
        "h-full font-sans",
        archivo.variable,
        publicSans.variable,
        splineMono.variable,
      )}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
