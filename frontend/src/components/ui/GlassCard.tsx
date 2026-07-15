import { cn } from "@/lib/cn";

/** Terminal panel (kept name for marketplace imports). */
export function GlassCard({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "rich" | "strong";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-panel",
        tone === "rich" && "bg-panel-hover border-border-strong",
        className,
      )}
    >
      {children}
    </div>
  );
}
