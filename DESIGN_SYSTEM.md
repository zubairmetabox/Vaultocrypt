# Design System — MetaBox Standard

This document captures everything needed to replicate the Vaultocrypt aesthetic in any new Next.js project. Copy it, follow the steps in order, and you will have an identical starting point.

---

## 1. Bootstrap

```bash
pnpm create next-app@latest <app-name> --typescript --tailwind --app --src-dir --import-alias "@/*"
cd <app-name>
```

### Apply the shadcn Luma preset

```bash
pnpm dlx shadcn@latest init --preset b6nWBwrEtW --template next
```

This installs the full component library and injects the correct `components.json`, `tailwind.config`, and base CSS. **Do not run plain `shadcn init`** — the preset is what gives you the correct colour palette and border-radius scale.

---

## 2. Required packages

```bash
# Fonts
pnpm add next/font  # already included in Next.js

# Page transition loader
pnpm add nextjs-toploader

# Prisma (if using a database)
pnpm add prisma @prisma/client @prisma/adapter-neon
pnpm add -D dotenv
```

---

## 3. Fonts

Use **Geist** — it ships with Next.js and pairs perfectly with the palette.

```tsx
// src/app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Apply to <html>:
<html className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
```

---

## 4. Dark mode — no flash on reload

Add this **inline sync script** directly in `<head>` of your root server layout. `next/script` with `beforeInteractive` does NOT prevent the flash — only a raw inline script blocks paint in time.

```tsx
// src/app/layout.tsx  (server component — no "use client")
const themeInitScript = `
(() => {
  const storageKey = "app-theme";          // ← change to your app name
  const root = document.documentElement;
  const stored = localStorage.getItem(storageKey);
  const theme = stored === "light" || stored === "dark" || stored === "system"
    ? stored : "system";
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const resolved = theme === "system" ? sys : theme;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
})();
`;

// In JSX:
<head>
  <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
</head>
```

Add `suppressHydrationWarning` to `<html>` to silence React's hydration warning about the class mismatch.

---

## 5. Page transition loader

```tsx
// src/app/layout.tsx — inside <body>, before everything else
import NextTopLoader from "nextjs-toploader";

<body>
  <NextTopLoader color="#9edcff" height={2} showSpinner={false} shadow={false} />
  {/* rest of providers */}
</body>
```

`#9edcff` is the dark-mode primary — visible against both light and dark backgrounds.

---

## 6. CSS variables and globals

Replace the contents of `src/app/globals.css` with the following. This is the exact palette used across MetaBox products.

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:where(.dark, .dark *));

/* ── Light ────────────────────────────────────────────────────────────────── */
:root {
  --background: #f6f9fc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #0f172a;
  --primary-foreground: #f8fafc;
  --secondary: #eef4fa;
  --secondary-foreground: #0f172a;
  --muted: #edf2f7;
  --muted-foreground: #5c6b7f;
  --accent: #dff4ff;
  --accent-foreground: #0f172a;
  --destructive: #c2410c;
  --destructive-foreground: #fff7ed;
  --border: #dbe5ef;
  --input: #dbe5ef;
  --ring: #38bdf8;
  --sidebar: rgba(244, 249, 255, 0.96);
  --brand-from: #0f172a;
  --brand-to: #0891b2;
  --app-shell-bg: radial-gradient(circle at top left, rgba(163, 230, 255, 0.6), transparent 32%),
    radial-gradient(circle at top right, rgba(15, 23, 42, 0.08), transparent 28%),
    linear-gradient(180deg, #f6fbff 0%, #f3f5fb 44%, #eef2f7 100%);
  --selection-bg: #bfdbfe;
  --selection-fg: #0f172a;
  color-scheme: light;
}

/* ── Dark ─────────────────────────────────────────────────────────────────── */
.dark {
  --background: #08111f;
  --foreground: #e6eef8;
  --card: #0d1728;
  --card-foreground: #e6eef8;
  --popover: #101b2d;
  --popover-foreground: #e6eef8;
  --primary: #9edcff;
  --primary-foreground: #07111e;
  --secondary: #132136;
  --secondary-foreground: #dbe9f7;
  --muted: #101d31;
  --muted-foreground: #8fa4be;
  --accent: #16283c;
  --accent-foreground: #e6eef8;
  --destructive: #fb923c;
  --destructive-foreground: #2b1300;
  --border: #213149;
  --input: #17263a;
  --ring: #67e8f9;
  --sidebar: rgba(8, 17, 31, 0.92);
  --brand-from: #38bdf8;
  --brand-to: #22d3ee;
  --app-shell-bg: radial-gradient(circle at top left, rgba(34, 211, 238, 0.16), transparent 30%),
    radial-gradient(circle at top right, rgba(148, 163, 184, 0.1), transparent 28%),
    linear-gradient(180deg, #07111e 0%, #091526 45%, #0b1626 100%);
  --selection-bg: #164e63;
  --selection-fg: #ecfeff;
  color-scheme: dark;
}

/* ── Scrollbar colours ────────────────────────────────────────────────────── */
:root {
  --scrollbar-track: rgba(148, 163, 184, 0.12);
  --scrollbar-thumb: rgba(15, 23, 42, 0.28);
  --scrollbar-thumb-hover: rgba(15, 23, 42, 0.4);
}
.dark {
  --scrollbar-track: rgba(148, 163, 184, 0.1);
  --scrollbar-thumb: rgba(191, 219, 254, 0.3);
  --scrollbar-thumb-hover: rgba(191, 219, 254, 0.45);
}

/* ── Tailwind theme bridge ────────────────────────────────────────────────── */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-brand-from: var(--brand-from);
  --color-brand-to: var(--brand-to);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* ── Base ─────────────────────────────────────────────────────────────────── */
* { border-color: var(--border); }

body {
  background: var(--background);
  color: var(--foreground);
}

button, a, input {
  transition-duration: 180ms;
}

::selection, *::selection, input::selection, textarea::selection {
  background: var(--selection-bg);
  color: var(--selection-fg);
}

/* ── Sleek scrollbar ──────────────────────────────────────────────────────── */
/* Apply .app-scrollbar to any scrollable container */
.app-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}
.app-scrollbar::-webkit-scrollbar { width: 10px; }
.app-scrollbar::-webkit-scrollbar-track {
  margin-block: 6px;
  border-radius: 999px;
  background: var(--scrollbar-track);
}
.app-scrollbar::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: var(--scrollbar-thumb);
  background-clip: padding-box;
}
.app-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
  background-clip: padding-box;
}
```

---

## 7. App shell background

The ambient gradient lives in `--app-shell-bg`. Apply it to the outermost shell div:

```tsx
<div style={{ background: "var(--app-shell-bg)" }} className="h-screen overflow-hidden">
```

---

## 8. Border-radius scale

The design uses large, consistent rounding. Standard values used across components:

| Context | Class |
|---|---|
| Outermost panels / sidebar | `rounded-[2rem]` |
| Cards, dialogs | `rounded-[1.75rem]` |
| Record / list rows | `rounded-[1.5rem]` |
| Smaller cards inside rows | `rounded-[1.4rem]` |
| Buttons, inputs | `rounded-[1.25rem]` |
| Badges, small chips | `rounded-[1rem]` |
| Icon containers | `rounded-lg` or `rounded-xl` |

---

## 9. Key shadcn components to install

After init, add these explicitly:

```bash
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add toggle-group
pnpm dlx shadcn@latest add checkbox
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add tooltip
pnpm dlx shadcn@latest add textarea
pnpm dlx shadcn@latest add badge
```

### DialogBody pattern

Add this export to `src/components/ui/dialog.tsx` for scrollable dialog content:

```tsx
const DialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("app-scrollbar flex-1 min-h-0 overflow-y-auto px-6 py-4", className)}
    {...props}
  />
));
DialogBody.displayName = "DialogBody";
```

Update `DialogContent` to use `flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden`, and `DialogHeader` / `DialogFooter` to use `shrink-0`.

---

## 10. Tooltip provider

Wrap children in the root layout with `TooltipProvider`:

```tsx
import { TooltipProvider } from "@/components/ui/tooltip";
// ...
<TooltipProvider>{children}</TooltipProvider>
```

---

## 11. Theme toggle

The `ThemeProvider` pattern used here stores the preference in `localStorage` under a key like `"app-theme"` and toggles the `.dark` class on `<html>`. Match the storage key to what you used in the inline `themeInitScript`.

---

## 12. Clerk auth (if used)

```bash
pnpm add @clerk/nextjs
```

Add to `globals.css`:
```css
@import "@clerk/ui/themes/shadcn.css";
```

Add to `.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

---

## 13. UX Standards

These rules apply to every interactive surface. A feature is not done until all relevant rules are satisfied.

### Loading states

Every operation that touches the network must have a visible in-progress state. There are two patterns — pick based on whether the result is predictable.

**Optimistic (preferred for local mutations)**
Update the UI immediately, fire the server action in the background, then let `router.refresh()` sync the authoritative state silently. The user never waits.

```tsx
function handleDelete() {
  const targetId = deleteTarget.id;
  // 1. Update local state immediately
  setItems((prev) => prev.filter((i) => i.id !== targetId));
  setDeleteTarget(null);
  // 2. Persist in background
  startTransition(async () => {
    await deleteItem(targetId);
    router.refresh();
  });
}

function handleCreate(draft) {
  // 1. Prepend optimistic record with a temp ID
  const tempId = `optimistic-${Date.now()}`;
  setItems((prev) => [{ ...draft, id: tempId, createdAt: new Date() }, ...prev]);
  setCreateOpen(false);
  // 2. Persist in background
  startTransition(async () => {
    await createItem(draft);
    router.refresh(); // replaces temp ID with real one
  });
}
```

Use optimistic updates for: create, edit, delete on list items.

**Pending spinner (for operations with unknown outcomes)**
Use `useTransition` + a `Loader2` spinner on the action button when the result cannot be predicted client-side (e.g. a save that may fail validation server-side, a bulk import, an export).

```tsx
const [isPending, startTransition] = useTransition();

<Button onClick={handleSave} disabled={isPending}>
  {isPending && <Loader2 className="size-4 animate-spin" />}
  Save changes
</Button>
```

Use separate `useTransition` instances for independent operations (create / edit / delete) so their loading states don't bleed into each other.

**Page navigation**
Always mount `<NextTopLoader color="#9edcff" height={2} showSpinner={false} shadow={false} />` at the root layout. It fires automatically on every `<Link>` click and `router.push` — no per-page wiring needed.

---

### Dialog behaviour

**Always reset the form on open.**
Radix `onOpenChange` only fires for internally-triggered closes (Escape, overlay click). When a parent sets `open={true}` via prop, `onOpenChange` is not called. Use `useEffect` to reset:

```tsx
useEffect(() => {
  if (open) {
    setDraft(record ? toDraft(record) : EMPTY_DRAFT);
  }
}, [open]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Block close during save.**
While `isPending`, prevent the dialog from closing and disable all inputs:

```tsx
function handleOpenChange(nextOpen: boolean) {
  if (isPending) return;
  onOpenChange(nextOpen);
}
```

**Disable Cancel during save.**
Both the primary and cancel buttons should be `disabled={isPending}`. Never let the user close a dialog mid-flight.

**Error feedback.**
If a server action throws, show an inline error message inside the dialog. Never silently fail or leave the dialog in a broken state.

---

### Destructive actions

- Never delete on first click. Always require a confirmation dialog.
- The confirmation dialog must name the item being deleted.
- Both Cancel and Confirm must be disabled while the delete is in flight.
- Use optimistic removal: remove the item from local state before awaiting the server, so the list updates instantly when the user confirms.

```tsx
// ✅ correct
setItems((prev) => prev.filter((i) => i.id !== targetId));
setDeleteTarget(null);
startTransition(async () => { await deleteItem(targetId); router.refresh(); });

// ❌ wrong — user sees the item for 2+ seconds after confirming
startTransition(async () => { await deleteItem(targetId); router.refresh(); });
```

---

### Empty states

Every list or collection must have a designed empty state — not a blank area. Include:
- A muted icon representing the content type
- A short headline ("No records yet")
- A one-line description explaining what will appear here
- A CTA button to create the first item (when creation is available on this screen)

---

### Feedback patterns

| Action | Feedback |
|---|---|
| Copy to clipboard | Button label + icon swap to "Copied" for 2 seconds |
| Reveal secret | Button toggles between Reveal / Hide with matching icon |
| Bulk select | Inline chip showing "N selected" appears in the toolbar |
| Successful import | Toast: "Imported X clients and Y records" |
| Failed save | Inline error message inside the dialog, not a page-level error |
| Destructive confirm | Confirmation dialog naming the item, with a red Confirm button |

Toast notifications should be used for outcomes that happen outside the current focused dialog — import completion, export download, background sync errors. Use `sonner` or the shadcn `toast` component.

---

### Accessibility

- All dialogs must have a visible or `sr-only` `<DialogTitle>` and `<DialogDescription>`.
- Icon-only buttons must have `aria-label`.
- Focus must be trapped inside open dialogs (Radix handles this automatically).
- Keyboard navigation must work for all primary actions (Tab, Enter, Escape).
- Colour alone must never be the only signal — pair colour with an icon or label.

---

### Performance rules

- Secrets are never included in page renders. Fetch them only via an explicit Reveal or Copy server action.
- Sidebar data is fetched server-side at layout level — the client component receives it as a prop. Never fire a client-side fetch just to populate navigation.
- `router.refresh()` is the reconciliation mechanism after mutations. It re-runs server components and syncs props — use it consistently instead of managing server state locally.
- Lists beyond ~100 items should paginate or virtualise.

---

## Reference: complete root layout

```tsx
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const themeInitScript = `
(() => {
  const storageKey = "app-theme";
  const root = document.documentElement;
  const stored = localStorage.getItem(storageKey);
  const theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.classList.toggle("dark", theme === "system" ? sys === "dark" : theme === "dark");
  root.style.colorScheme = theme === "system" ? sys : theme;
})();
`;

export const metadata: Metadata = {
  title: "App Name",
  description: "Description.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full font-sans text-foreground">
        <NextTopLoader color="#9edcff" height={2} showSpinner={false} shadow={false} />
        <ThemeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```
