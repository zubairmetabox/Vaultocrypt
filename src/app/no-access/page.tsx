import { ShieldOff } from "lucide-react";
import Link from "next/link";

export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-[1.5rem] border border-border/70 bg-muted">
          <ShieldOff className="size-7 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Access restricted
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Your account hasn&apos;t been granted access to Vaultocrypt. Contact your
            administrator to be added.
          </p>
        </div>

        <Link
          href="/sign-in"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Sign in with a different account
        </Link>
      </div>
    </div>
  );
}
