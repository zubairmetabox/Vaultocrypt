import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl =
  process.env.DIRECT_URL ??
  "postgresql://postgres:postgres@localhost:5432/vaultocrypt";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: directUrl,
  },
});
