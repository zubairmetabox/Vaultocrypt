import { clerkClient } from "@clerk/nextjs/server";

type ClerkProfile = {
  clerkUserId: string | null;
  firstName: string | null;
  lastName: string | null;
};

/**
 * Look up a user in Clerk by email address.
 * Returns their Clerk ID and name if found, nulls otherwise.
 * Works for any user who has registered with Clerk (e.g. via Google).
 */
export async function lookupClerkUserByEmail(email: string): Promise<ClerkProfile> {
  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({ emailAddress: [email], limit: 1 });
    const clerkUser = result.data[0];
    if (!clerkUser) return { clerkUserId: null, firstName: null, lastName: null };
    return {
      clerkUserId: clerkUser.id,
      firstName: clerkUser.firstName ?? null,
      lastName: clerkUser.lastName ?? null,
    };
  } catch {
    return { clerkUserId: null, firstName: null, lastName: null };
  }
}
