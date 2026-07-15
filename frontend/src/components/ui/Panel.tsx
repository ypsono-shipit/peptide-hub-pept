import { cn } from "@/lib/cn";

export function Panel({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "strong";
}) {
  return (
    <div className={cn(tone === "strong" ? "panel-strong" : "panel", className)}>
      {children}
    </div>
  );
}
