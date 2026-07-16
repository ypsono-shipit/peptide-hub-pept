import { cn } from "@/lib/cn";

/** "pept trade" wordmark in Helvetica Neue Regular (no caps). */
export function BrandWordmark({
  className,
  as: Tag = "span",
}: {
  className?: string;
  as?: "span" | "div" | "p";
}) {
  return (
    <Tag
      className={cn(
        "font-brand text-sm font-normal normal-case tracking-[0.04em] text-ink",
        className,
      )}
    >
      pept trade
    </Tag>
  );
}
