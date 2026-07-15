import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Peptide Hub — The Operating System for Peptide Finance",
  description: "Peptide/biotech markets, tokenized biotech stocks, and the world's largest peptide marketplace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          <div className="ambient-bg" />
          {/* This is a dense desktop terminal, not a responsive layout — below
              its minimum width, panels should scroll horizontally as a unit
              rather than get squished into each other. */}
          <div className="h-screen overflow-x-auto overflow-y-hidden">
            <div className="relative z-10 flex h-full min-w-[1360px] gap-5 p-5">
              <Sidebar />
              <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
