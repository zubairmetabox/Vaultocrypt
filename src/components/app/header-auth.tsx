"use client";

import {
  useUser,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type HeaderAuthProps = {
  clerkEnabled: boolean;
};

export function HeaderAuth({ clerkEnabled }: HeaderAuthProps) {
  if (!clerkEnabled) {
    return (
      <div className="hidden items-center gap-3 sm:flex">
        <Badge variant="outline" className="bg-card/70">
          Clerk not configured
        </Badge>
      </div>
    );
  }

  return <ConfiguredHeaderAuth />;
}

function ConfiguredHeaderAuth() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="hidden items-center gap-3 sm:flex">
        <Badge variant="outline" className="bg-card/70">
          Loading auth
        </Badge>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="hidden items-center gap-3 sm:flex">
        <SignInButton mode="modal">
          <Button variant="outline">Sign in</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button>Get started</Button>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-3 sm:flex">
      <div className="flex items-center gap-3 rounded-[1.25rem] border border-border/70 bg-muted/50 px-3 py-2">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">MetaBox Team</p>
          <p className="text-xs text-muted-foreground">
            Internal workspace, v1 foundation
          </p>
        </div>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-10",
            },
          }}
        />
      </div>
    </div>
  );
}
