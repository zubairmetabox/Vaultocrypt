"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type WorkspaceShellProps = {
  children: React.ReactNode;
};

const pageMeta: Record<string, { title: string; eyebrow: string }> = {
  "/": { title: "Client Directory", eyebrow: "Vaultocrypt v1" },
  "/activity": { title: "Activity", eyebrow: "Visible audit posture" },
  "/search": { title: "Search", eyebrow: "Fast secondary access" },
  "/settings": { title: "Settings", eyebrow: "Preferences and controls" },
};

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const currentPage = pageMeta[pathname] ?? pageMeta["/"];

  return (
    <div className="min-h-screen" style={{ background: "var(--app-shell-bg)" }}>
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-4 p-3 sm:p-4 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <Sidebar pathname={pathname} />
        </div>

        <div className="flex min-h-[calc(100vh-1.5rem)] flex-col rounded-[2rem] border border-border/80 bg-background/88 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
          <header className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-6">
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

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  {currentPage.eyebrow}
                </p>
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {currentPage.title}
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-3 rounded-[1.25rem] border border-border/70 bg-muted/50 px-3 py-2 sm:flex">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">MetaBox Team</p>
                <p className="text-xs text-muted-foreground">
                  Internal workspace, v1 foundation
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
