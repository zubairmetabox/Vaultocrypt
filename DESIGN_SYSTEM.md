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
