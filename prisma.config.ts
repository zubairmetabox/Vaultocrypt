import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js uses .env.local; tell dotenv where to look
config({ path: ".env.local" });

const directUrl =
  process.env.DIRECT_URL ??
  "postgresql://postgres:postgres@localhost:5432/vaultocrypt";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: directUrl,
  },
});
