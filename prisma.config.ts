import path from 'node:path';
import type { PrismaConfig } from 'prisma';

export default {
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    adapter: async () => {
      // placeholder adapter for type checking
      throw new Error('Configure your database adapter in prisma.config.ts');
    },
  },
} satisfies PrismaConfig;
