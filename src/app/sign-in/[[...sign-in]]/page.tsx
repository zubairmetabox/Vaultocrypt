import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--app-shell-bg)" }}>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            card: "shadow-xl",
          },
        }}
      />
    </div>
  );
}
