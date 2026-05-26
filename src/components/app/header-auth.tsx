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
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/70 shadow-sm">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-8 ring-0 shadow-none",
              userButtonTrigger:
                "flex size-full items-center justify-center rounded-full p-0",
            },
          }}
        />
      </div>
    </div>
  );
}
