import { LockKeyhole, Shield, SunMoon, Users } from "lucide-react";

import { ThemeToggle } from "@/components/app/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const settingsCards = [
  {
    title: "Theme",
    copy: "Choose how Vaultocrypt should look for you: light, dark, or automatic system mode.",
    icon: SunMoon,
  },
  {
    title: "Roles",
    copy: "Admin, editor, and viewer controls will live here as the authorization layer is added.",
    icon: Users,
  },
  {
    title: "Restrictions",
    copy: "Sensitive clients and records can be flagged as exceptions without changing the shared-first model.",
    icon: LockKeyhole,
  },
  {
    title: "Security posture",
    copy: "Reveal and copy behavior will remain visible and auditable across the product.",
    icon: Shield,
  },
];

export default function SettingsPage() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
        {settingsCards.slice(1).map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="border-border/70">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
                  <Icon className="size-4" />
                </div>
                <CardTitle className="mt-3">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{card.copy}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
