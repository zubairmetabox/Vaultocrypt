import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-3 rounded-[1.5rem] border border-border/80 bg-card/80 p-2.5 shadow-sm backdrop-blur",
        compact && "p-2",
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,var(--color-brand-from),var(--color-brand-to))] text-primary-foreground shadow-lg shadow-cyan-950/15 transition-transform duration-200 group-hover:scale-[1.03]">
        <ShieldCheck className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Vaultocrypt
        </p>
        <p className="text-xs text-muted-foreground">MetaBox internal vault</p>
      </div>
    </Link>
  );
}
