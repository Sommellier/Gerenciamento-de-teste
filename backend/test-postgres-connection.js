/**
 * Script de Teste: Conexão com PostgreSQL
 * Uso: node test-postgres-connection.js
 */

require('dotenv').config()

async function testPostgresConnection() {
  console.log('🔍 Testando conexão com PostgreSQL...\n')
  
  const { DATABASE_URL } = process.env
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada!')
    console.error('Configure no arquivo .env:')
    console.error('DATABASE_URL="postgresql://postgres:senha@localhost:5432/qa_test_manager?schema=public"')
    process.exit(1)
  }
  
  console.log('✅ DATABASE_URL configurada\n')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    console.log('📡 Testando conexão...')
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados!\n')
    
    console.log('📊 Executando query de teste...')
    const userCount = await prisma.user.count()
    console.log(`✅ Query executada! Total de usuários: ${userCount}\n`)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 Conexão bem-sucedida!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    await prisma.$disconnect()
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Erro na conexão:', error.message)
    console.error('\nPossíveis soluções:')
    console.error('1. Verifique se PostgreSQL está rodando')
    console.error('2. Verifique a DATABASE_URL no arquivo .env')
    console.error('3. Verifique se o banco de dados existe')
    console.error('4. Execute: npx prisma migrate dev --name init_postgres')
    process.exit(1)
  }
}

testPostgresConnection()

