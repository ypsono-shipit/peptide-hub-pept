import { cn } from "@/lib/cn";

/** "PEPT TRADE" in Helvetica Neue Regular. */
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
        "font-brand text-sm font-normal uppercase tracking-[0.06em] text-ink",
        className,
      )}
    >
      PEPT TRADE
    </Tag>
  );
}
