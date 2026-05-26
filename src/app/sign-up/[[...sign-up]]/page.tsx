import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--app-shell-bg)" }}>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={{
          elements: {
            card: "shadow-xl",
          },
        }}
      />
    </div>
  );
}
