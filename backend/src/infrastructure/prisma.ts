import { config } from 'dotenv'
config({ path: '.env' }) 

import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL não está definida. Verifique seu .env')
}

export const prisma = new PrismaClient()
