"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

/** Landing `/` is full-bleed; app routes keep the terminal shell. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Marketing + public docs + internal admin: full-bleed (no trade shell sidebar)
  const isMarketing =
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/waitlist" ||
    pathname === "/launchpad" ||
    pathname?.startsWith("/launchpad/") ||
    pathname === "/admin" ||
    pathname?.startsWith("/admin/") ||
    pathname === "/oracle" ||
    pathname?.startsWith("/oracle/") ||
    pathname === "/docs" ||
    pathname?.startsWith("/docs/");
  // / and /home share the same full-bleed landing shell

  if (isMarketing) {
    return <div className="min-h-screen w-full bg-bg text-ink">{children}</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar />
      {/* Isolate main pane so sidebar rings/shadows never paint over page titles */}
      <div className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
        {children}
      </div>
    </div>
  );
}
