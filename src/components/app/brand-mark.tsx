import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  plain?: boolean;
};

export function BrandMark({ compact = false, plain = false }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2.5",
        !plain && "rounded-[1.5rem] border border-border/80 bg-card/80 shadow-sm backdrop-blur",
        !plain && (compact ? "p-2" : "p-2.5"),
      )}
    >
      <div className={cn(
        "flex items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,var(--color-brand-from),var(--color-brand-to))] text-primary-foreground shadow-lg shadow-cyan-950/15 transition-transform duration-200 group-hover:scale-[1.03]",
        plain ? "size-8 rounded-xl" : "size-11",
      )}>
        <ShieldCheck className={plain ? "size-4" : "size-5"} />
      </div>
      <p className="text-sm font-semibold tracking-tight text-foreground">
        Vaultocrypt
      </p>
    </Link>
  );
}
