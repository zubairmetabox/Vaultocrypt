import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

const isProtectedRoute = createRouteMatcher([
  "/",
  "/clients(.*)",
  "/activity(.*)",
  "/settings(.*)",
]);

const fallbackMiddleware = () => NextResponse.next();

export default clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect({
          unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
        });
      }
    })
  : fallbackMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
