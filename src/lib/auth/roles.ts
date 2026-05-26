export const APP_ROLES = ["ADMIN", "PROJECT_MANAGER", "USER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project Manager",
  USER: "User",
};
