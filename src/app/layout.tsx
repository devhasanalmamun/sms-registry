import type { Metadata } from "next";
import { Spectral, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

/*
 * Three faces, three jobs:
 *   Spectral   — headings. A screen-first serif with a documentary register.
 *   Plex Sans  — interface text.
 *   Plex Mono  — anything read off the screen and typed into another system:
 *                student IDs, payment references, amounts, dates.
 */

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
        spectral.variable,
        plexSans.variable,
        plexMono.variable,
      )}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
