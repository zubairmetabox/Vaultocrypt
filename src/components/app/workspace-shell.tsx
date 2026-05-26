"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { HeaderAuth } from "@/components/app/header-auth";
import { Sidebar } from "@/components/app/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type WorkspaceShellProps = {
  children: React.ReactNode;
  clerkEnabled: boolean;
};

const pageMeta: Record<string, { title: string; eyebrow?: string }> = {
  "/": { title: "Client Directory" },
  "/activity": { title: "Activity", eyebrow: "Visible audit posture" },
  "/settings": { title: "Settings", eyebrow: "Preferences and controls" },
};

export function WorkspaceShell({
  children,
  clerkEnabled,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const currentPage = pathname.startsWith("/clients/")
    ? { title: "Client", eyebrow: "Records and access" }
    : (pageMeta[pathname] ?? pageMeta["/"]);

  return (
    <div className="min-h-screen" style={{ background: "var(--app-shell-bg)" }}>
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-4 p-3 sm:p-4 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <Sidebar pathname={pathname} />
        </div>

        <div className="flex h-[calc(100vh-1.5rem)] min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border border-border/80 bg-background/88 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/88 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon-sm" className="lg:hidden">
                      <Menu className="size-4" />
                      <span className="sr-only">Open navigation</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xs p-3">
                    <DialogTitle className="sr-only">Navigation</DialogTitle>
                    <DialogDescription className="sr-only">
                      Workspace navigation
                    </DialogDescription>
                    <Sidebar pathname={pathname} />
                  </DialogContent>
                </Dialog>

                <div className="hidden min-w-0 flex-1 items-center lg:flex">
                  <div className="flex w-full max-w-xl items-center gap-2 rounded-[1.25rem] border border-border/70 bg-card/70 px-3 py-2 shadow-sm">
                    <Search className="size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clients, records, and notes"
                      className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <HeaderAuth clerkEnabled={clerkEnabled} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {currentPage.eyebrow ? (
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    {currentPage.eyebrow}
                  </p>
                ) : null}
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {currentPage.title}
                </h1>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
