/**
 * Script de Teste: Conexão com PostgreSQL
 * Uso: npx ts-node scripts/test-postgres.ts
 */

import { config } from 'dotenv'
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔍 Testando conexão com PostgreSQL...\n')
  
  try {
    // Teste 1: Conexão
    console.log('📡 Testando conexão...')
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados com sucesso!\n')
    
    // Teste 2: Query simples
    console.log('📊 Executando query de teste...')
    const userCount = await prisma.user.count()
    console.log(`✅ Query executada com sucesso! Usuários: ${userCount}\n`)
    
    // Teste 3: Verificar tabelas
    console.log('📋 Verificando tabelas...')
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    
    if (tables.length === 0) {
      console.log('⚠️  Nenhuma tabela encontrada. Execute as migrações:')
      console.log('   npx prisma migrate dev --name init_postgres')
    } else {
      console.log('✅ Tabelas encontradas:')
      tables.forEach(table => {
        console.log(`   - ${table.tablename}`)
      })
    }
    console.log()
    
    // Teste 4: Criar usuário de teste
    console.log('🧪 Testando criação de registro...')
    try {
      const testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          password: 'test123'
        }
      })
      console.log(`✅ Usuário de teste criado: ${testUser.email}`)
      
      // Limpar
      await prisma.user.delete({ where: { id: testUser.id } })
      console.log('✅ Usuário de teste removido')
    } catch (error: any) {
      console.log(`⚠️  Não foi possível criar usuário de teste: ${error.message}`)
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 Todos os testes passaram!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\nPróximos passos:')
    console.log('1. Execute as migrações: npx prisma migrate dev')
    console.log('2. Execute a aplicação: npm run dev')
    console.log('3. Visualize o banco: npx prisma studio')
    
  } catch (error: any) {
    console.error('\n❌ Erro:', error.message)
    console.error('\nPossíveis soluções:')
    console.error('1. Verifique se PostgreSQL está rodando')
    console.error('2. Verifique a DATABASE_URL no arquivo .env')
    console.error('3. Verifique se o banco de dados existe')
    console.error('4. Verifique permissões do usuário')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testConnection()
  .then(() => {
    console.log('\n✅ Teste concluído')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Teste falhou:', error)
    process.exit(1)
  })

