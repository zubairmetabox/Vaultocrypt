"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole, type UserRow } from "@/lib/actions/users";
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

export function TeamSettings({ users, currentUserId }: Props) {
  const role = useRole();
  const isAdmin = role === "ADMIN";

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No team members have signed in yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {!isAdmin && (
        <p className="mb-3 text-xs text-muted-foreground">
          Only Admins can change roles.
        </p>
      )}
      {users.map((user) => (
        <UserRoleRow
          key={user.id}
          user={user}
          isSelf={user.id === currentUserId}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
