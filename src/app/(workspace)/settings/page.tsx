import { Archive, AlertTriangle, Mail, SunMoon, Users } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { TeamSettings } from "@/components/app/team-settings";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { ProjectArchive } from "@/components/app/project-archive";
import { SharingSettings } from "@/components/app/sharing-settings";
import { SystemLogs } from "@/components/app/system-logs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdmins } from "@/lib/actions/users";
import { getArchivedProjects } from "@/lib/actions/projects";
import { getAppSettings, getSystemLogs } from "@/lib/actions/settings";
import { getCurrentRole } from "@/lib/auth/get-role";
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
  const [currentUserId, role] = await Promise.all([
    getCurrentUserId(),
    getCurrentRole(),
  ]);

  const isAdmin = role === "ADMIN";

  const [admins, archivedProjects, appSettings, systemLogs] = await Promise.all([
    isAdmin ? getAdmins(currentUserId) : Promise.resolve([]),
    isAdmin ? getArchivedProjects() : Promise.resolve([]),
    isAdmin ? getAppSettings() : Promise.resolve(null),
    isAdmin ? getSystemLogs(100) : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">

      {/* Appearance — visible to all */}
      <Card className={`border-border/70 ${!isAdmin ? "lg:col-span-2" : ""}`}>
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

      {/* Admin-only cards */}
      {isAdmin && (
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
      )}

      {isAdmin && (
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader>
            <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
              <Mail className="size-4" />
            </div>
            <CardTitle className="mt-3">Sharing</CardTitle>
          </CardHeader>
          <CardContent>
            <SharingSettings
              initialEmail={appSettings?.sharingFromEmail ?? null}
              initialName={appSettings?.sharingFromName ?? null}
            />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader>
            <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
              <AlertTriangle className="size-4" />
            </div>
            <CardTitle className="mt-3">System Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemLogs initialLogs={systemLogs} />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader>
            <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
              <Archive className="size-4" />
            </div>
            <CardTitle className="mt-3">Project archive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              Archived projects and all their records are preserved here. Restore a project to make
              it active again, or permanently delete it to free the data.
            </p>
            <ProjectArchive initialProjects={archivedProjects} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
