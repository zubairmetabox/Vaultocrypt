import { LockKeyhole, SunMoon, Users } from "lucide-react";

import { ThemeToggle } from "@/components/app/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ROLE_LABELS, APP_ROLES } from "@/lib/auth/roles";

export default function SettingsPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
            <SunMoon className="size-4" />
          </div>
          <CardTitle className="mt-3">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Switch between light mode, dark mode, or automatic system-following
            behavior.
          </p>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
            <Users className="size-4" />
          </div>
          <CardTitle className="mt-3">Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Admin, Project Manager, and User controls will live here as the
            authorization layer is added.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {APP_ROLES.map((role) => (
              <span
                key={role}
                className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground"
              >
                {APP_ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 lg:col-span-2">
        <CardHeader>
          <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
            <LockKeyhole className="size-4" />
          </div>
          <CardTitle className="mt-3">Restrictions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Sensitive clients and records can be flagged as exceptions without
            changing the shared-first model.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
