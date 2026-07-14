import { cn } from "@/lib/cn";

export function GlassCard({
  className,
  tone = "light",
  children,
}: {
  className?: string;
  /** "light" = standard dark glass panel. "rich" = same, plus a faint inner primary/accent glow for emphasis (hero cards). */
  tone?: "light" | "rich";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-glass border border-glass-border bg-glass text-ink shadow-glass backdrop-blur-2xl",
        className
      )}
    >
      {tone === "rich" && (
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
