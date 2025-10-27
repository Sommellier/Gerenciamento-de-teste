import { config } from 'dotenv'
config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' })

import { PrismaClient } from '@prisma/client'

// Validar se DATABASE_URL está definida em ambiente de desenvolvimento
if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be defined in development environment')
}

export const prisma = new PrismaClient()
