import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databasePath = process.env.DATABASE_PATH;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databasePath ? `file:${databasePath}` : undefined,
  },
});
