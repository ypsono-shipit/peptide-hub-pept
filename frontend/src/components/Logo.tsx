import Image from "next/image";
import { cn } from "@/lib/cn";

/** White asterisk mark on pure black — brand monogram. */
export function Logo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-asterisk.jpg"
        alt="PEPT"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        priority
      />
    </span>
  );
}
