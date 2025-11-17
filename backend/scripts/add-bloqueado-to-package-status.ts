/**
 * Script para adicionar o valor 'BLOQUEADO' ao enum PackageStatus
 * Uso: ts-node scripts/add-bloqueado-to-package-status.ts
 */

import { config } from 'dotenv'
config()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addBloqueadoToPackageStatus() {
  try {
    console.log('🔄 Adicionando valor BLOQUEADO ao enum PackageStatus...\n')

    // Executar o comando SQL para adicionar o valor ao enum
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_enum 
          WHERE enumlabel = 'BLOQUEADO' 
          AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'PackageStatus'
          )
        ) THEN
          ALTER TYPE "PackageStatus" ADD VALUE 'BLOQUEADO';
          RAISE NOTICE 'Valor BLOQUEADO adicionado ao enum PackageStatus';
        ELSE
          RAISE NOTICE 'Valor BLOQUEADO já existe no enum PackageStatus';
        END IF;
      END $$;
    `)

    console.log('✅ Valor BLOQUEADO adicionado com sucesso ao enum PackageStatus!\n')

    // Verificar se foi adicionado
    const enumValues = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'PackageStatus'
      )
      ORDER BY enumsortorder;
    `)

    console.log('📋 Valores atuais do enum PackageStatus:')
    enumValues.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.enumlabel}`)
    })
    console.log()

  } catch (error: any) {
    console.error('❌ Erro ao adicionar valor ao enum:', error.message)
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  O valor BLOQUEADO já existe no enum.')
    } else {
      console.error('\nDetalhes do erro:', error)
      process.exit(1)
    }
  } finally {
    await prisma.$disconnect()
  }
}

addBloqueadoToPackageStatus()

