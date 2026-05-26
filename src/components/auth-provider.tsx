import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";

type AuthProviderProps = {
  children: React.ReactNode;
};

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export function AuthProvider({ children }: AuthProviderProps) {
  if (!clerkConfigured) {
    return children;
  }

  return (
    <ClerkProvider
      appearance={{ theme: shadcn }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkProvider>
  );
}
