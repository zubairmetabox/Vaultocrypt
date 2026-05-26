import { Eye, KeyRound, ShieldCheck, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const events = [
  {
    actor: "Zubair",
    action: "revealed",
    target: "Cloudflare Production",
    icon: Eye,
    tone: "outline" as const,
  },
  {
    actor: "Operations",
    action: "copied",
    target: "Shopify Admin",
    icon: KeyRound,
    tone: "secondary" as const,
  },
  {
    actor: "Admin",
    action: "changed restrictions on",
    target: "Northstar Legal",
    icon: ShieldCheck,
    tone: "destructive" as const,
  },
  {
    actor: "Admin",
    action: "updated role for",
    target: "Viewer account",
    icon: UserCog,
    tone: "outline" as const,
  },
];

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.map((event) => {
            const Icon = event.icon;

            return (
              <div
                key={`${event.actor}-${event.target}`}
                className="flex items-center gap-4 rounded-[1.5rem] border border-border/70 bg-card/80 p-4"
              >
                <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-muted">
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{event.actor}</span> {event.action}{" "}
                    <span className="font-semibold">{event.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Visible audit posture for sensitive actions.
                  </p>
                </div>
                <Badge variant={event.tone}>Tracked</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
