import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' })
}

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL não está definida. Verifique seu .env ou jest.setup.js');
}

export const prisma = new PrismaClient()
