"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { HeaderAuth } from "@/components/app/header-auth";
import { Sidebar } from "@/components/app/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useClientTitle } from "@/contexts/client-title";
import { getClientById } from "@/lib/mock-data";

type WorkspaceShellProps = {
  children: React.ReactNode;
  clerkEnabled: boolean;
};

const pageMeta: Record<string, { title: string; eyebrow?: string }> = {
  "/": { title: "Client Directory" },
  "/activity": { title: "Activity" },
  "/settings": { title: "Settings", eyebrow: "Preferences and controls" },
};

export function WorkspaceShell({
  children,
  clerkEnabled,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const clientTitle = useClientTitle();
  const clientId = pathname.startsWith("/clients/")
    ? pathname.split("/")[2]
    : null;
  const currentClient = clientId ? getClientById(clientId) : null;
  const currentPage = pathname.startsWith("/clients/")
    ? { title: clientTitle ?? currentClient?.name ?? "Client", eyebrow: undefined }
    : (pageMeta[pathname] ?? pageMeta["/"]);

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ background: "var(--app-shell-bg)" }}
    >
      <div className="mx-auto grid h-full max-w-[1820px] gap-4 p-3 sm:p-4 lg:grid-cols-[280px_1fr]">
        <div className="hidden h-full lg:block">
          <Sidebar pathname={pathname} />
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-border/80 bg-background shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)]">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon-sm" className="lg:hidden">
                      <Menu className="size-4" />
                      <span className="sr-only">Open navigation</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xs" showCloseButton={false}>
                    <DialogTitle className="sr-only">Navigation</DialogTitle>
                    <DialogDescription className="sr-only">
                      Workspace navigation
                    </DialogDescription>
                    <DialogBody className="p-3">
                      <Sidebar pathname={pathname} />
                    </DialogBody>
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
                {pathname.startsWith("/clients/") ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link
                      href="/"
                      className="transition-colors duration-200 hover:text-foreground"
                    >
                      Clients
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">{currentPage.title}</span>
                  </div>
                ) : currentPage.eyebrow ? (
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

          <main className="app-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
