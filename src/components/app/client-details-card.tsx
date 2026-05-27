"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client, ClientStatus } from "@/lib/mock-data";

type ClientDetailsCardProps = {
  client: Client;
};

type ClientDraft = Pick<
  Client,
  "name" | "contact" | "vertical" | "status"
>;

const statuses: ClientStatus[] = ["Active", "Inactive"];

function statusBadgeVariant(status: ClientStatus) {
  if (status === "Inactive") return "secondary";
  return "outline";
}

export function ClientDetailsCard({ client }: ClientDetailsCardProps) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<ClientDraft>({
    name: client.name,
    contact: client.contact,
    vertical: client.vertical,
    status: client.status,
  });
  const [draft, setDraft] = useState<ClientDraft>(details);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setDraft(details);
    }
  }

  function updateDraft<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSave() {
    setDetails(draft);
    setOpen(false);
  }

  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <CardTitle>{details.name}</CardTitle>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{details.contact}</p>
            <p>{details.vertical}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant(details.status)}>{details.status}</Badge>

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <PencilLine className="size-4" />
                Edit details
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Edit client details</DialogTitle>
                <DialogDescription>
                  Update the visible client profile information for this workspace.
                </DialogDescription>
              </DialogHeader>

              <DialogBody>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>
                    Client name
                  </Label>
                  <Input
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>
                      Primary contact
                    </Label>
                    <Input
                      value={draft.contact}
                      onChange={(event) =>
                        updateDraft("contact", event.target.value)
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>
                      Vertical
                    </Label>
                    <Input
                      value={draft.vertical}
                      onChange={(event) =>
                        updateDraft("vertical", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>
                    Status
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={draft.status === status ? "default" : "outline"}
                        onClick={() => updateDraft("status", status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>

              </div>
              </DialogBody>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
    </Card>
  );
}
