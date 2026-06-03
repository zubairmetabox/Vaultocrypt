import { LockKeyhole, SunMoon, Users } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { TeamSettings } from "@/components/app/team-settings";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdmins } from "@/lib/actions/users";
import { prisma } from "@/lib/db";

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const currentUserId = await getCurrentUserId();
  const admins = await getAdmins(currentUserId);

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
            Switch between light mode, dark mode, or automatic system-following behavior.
          </p>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
            <Users className="size-4" />
          </div>
          <CardTitle className="mt-3">Admins</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamSettings admins={admins} />
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
