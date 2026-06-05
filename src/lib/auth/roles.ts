export const APP_ROLES = ["ADMIN", "USER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Admin",
  USER: "User",
};
