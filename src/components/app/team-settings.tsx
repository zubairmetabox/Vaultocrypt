"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUser, updateUserRole, type UserRow } from "@/lib/actions/users";
import { useRole } from "@/contexts/role";

type Props = {
  users: UserRow[];
  currentUserId: string | null;
};

function UserRoleRow({
  user,
  isSelf,
  isAdmin,
}: {
  user: UserRow;
  isSelf: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(newRole: "ADMIN" | "USER") {
    if (newRole === user.role) return;
    startTransition(async () => {
      await updateUserRole(user.id, newRole);
      router.refresh();
    });
  }

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unknown";

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-border/70 bg-card/70 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {name}
          {isSelf && (
            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
          )}
        </p>
        {user.email && (
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        )}
      </div>

      {isAdmin && !isSelf ? (
        <div className="flex items-center gap-2 shrink-0">
          {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          <Select
            value={user.role}
            onValueChange={(v) => handleRoleChange(v as "ADMIN" | "USER")}
            disabled={isPending}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Badge variant="outline" className="shrink-0 text-xs">
          {user.role === "ADMIN" ? "Admin" : "User"}
        </Badge>
      )}
    </div>
  );
}

function InviteForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "USER">("USER");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleInvite() {
    if (!email.trim() || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await inviteUser(email.trim(), inviteRole);
        setEmail("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add member.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-[1.25rem] border border-dashed border-border/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Add member
      </p>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="invite-email" className="sr-only">Email address</Label>
          <Input
            id="invite-email"
            ref={inputRef}
            type="email"
            placeholder="team@metabox.mu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            disabled={isPending}
          />
        </div>
        <Select
          value={inviteRole}
          onValueChange={(v) => setInviteRole(v as "ADMIN" | "USER")}
          disabled={isPending}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleInvite} disabled={!email.trim() || isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

export function TeamSettings({ users, currentUserId }: Props) {
  const role = useRole();
  const isAdmin = role === "ADMIN";

  return (
    <div className="space-y-3">
      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Only Admins can change roles.
        </p>
      )}

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members yet.</p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <UserRoleRow
              key={user.id}
              user={user}
              isSelf={user.id === currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {isAdmin && <InviteForm />}
    </div>
  );
}
