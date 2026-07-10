import path from 'path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: 'postgresql://postgres:postgres123@localhost:5432/stagegate_db',
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      return new PrismaPg({
        connectionString: 'postgresql://postgres:postgres123@localhost:5432/stagegate_db',
      })
    },
  },
})