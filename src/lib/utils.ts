import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns a safe http/https href for user-supplied URLs, or "#" if unparseable. */
export function safeUrl(url: string): string {
  const tryParse = (s: string) => {
    try {
      const p = new URL(s);
      return p.protocol === "https:" || p.protocol === "http:" ? s : null;
    } catch {
      return null;
    }
  };
  return tryParse(url) ?? tryParse(`https://${url}`) ?? "#";
}
