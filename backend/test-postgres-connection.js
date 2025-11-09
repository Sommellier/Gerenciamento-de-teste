/**
 * Script de Teste: Conexão com PostgreSQL
 * Uso: node test-postgres-connection.js
 */

require('dotenv').config()
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function testNetworkConnectivity(host, port) {
  console.log(`\n🌐 Testando conectividade de rede...`)
  console.log(`   Host: ${host}`)
  console.log(`   Porta: ${port}`)
  
  try {
    // Testa se a porta está acessível usando nc (netcat) ou telnet
    const { stdout, stderr } = await execAsync(`timeout 5 bash -c '</dev/tcp/${host}/${port}' 2>&1 || echo "FALHOU"`)
    
    if (stdout.includes('FALHOU') || stderr) {
      console.log(`   ❌ Não foi possível conectar à porta ${port}`)
      return false
    }
    
    console.log(`   ✅ Porta ${port} está acessível`)
    return true
  } catch (error) {
    console.log(`   ❌ Erro ao testar conectividade: ${error.message}`)
    return false
  }
}

async function testPostgresConnection() {
  console.log('🔍 Testando conexão com PostgreSQL...\n')
  
  const { DATABASE_URL } = process.env
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada!')
    console.error('Configure no arquivo .env:')
    console.error('DATABASE_URL="postgresql://postgres:senha@localhost:5432/qa_test_manager?schema=public"')
    process.exit(1)
  }
  
  // Extrai informações da URL usando URL parsing
  let user, password, host, port, database
  
  try {
    // Remove aspas se houver
    const cleanUrl = DATABASE_URL.replace(/^["']|["']$/g, '')
    
    // Tenta com porta
    let urlMatch = cleanUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)
    
    if (urlMatch) {
      user = urlMatch[1]
      password = urlMatch[2]
      host = urlMatch[3]
      port = urlMatch[4]
      database = urlMatch[5]
    } else {
      // Tenta sem porta (usa padrão 5432)
      urlMatch = cleanUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/)
      if (urlMatch) {
        user = urlMatch[1]
        password = urlMatch[2]
        host = urlMatch[3]
        port = '5432'
        database = urlMatch[4]
      } else {
        throw new Error('Formato inválido')
      }
    }
  } catch (error) {
    console.error('❌ DATABASE_URL com formato inválido!')
    console.error('Formato esperado: postgresql://usuario:senha@host:porta/banco')
    console.error(`URL recebida: ${DATABASE_URL.substring(0, 80)}...`)
    process.exit(1)
  }
  
  console.log('✅ DATABASE_URL configurada')
  console.log(`   Usuário: ${user}`)
  console.log(`   Host: ${host}`)
  console.log(`   Porta: ${port}`)
  console.log(`   Banco: ${database}`)
  
  // Testa conectividade de rede primeiro
  const networkOk = await testNetworkConnectivity(host, port)
  
  if (!networkOk) {
    console.log('\n⚠️  Problema de conectividade de rede detectado!')
    console.log('\n📋 Possíveis causas e soluções:')
    console.log('\n1. AWS RDS Security Group:')
    console.log('   - Acesse o console AWS RDS')
    console.log('   - Vá em "Databases" > Selecione seu banco > "Connectivity & security"')
    console.log('   - Clique no Security Group')
    console.log('   - Adicione uma regra de entrada (Inbound) permitindo:')
    console.log('     * Tipo: PostgreSQL')
    console.log('     * Porta: 5432')
    console.log('     * Origem: IP do seu servidor (ou 0.0.0.0/0 para teste)')
    console.log('\n2. Verifique se o RDS está rodando:')
    console.log('   - No console AWS, verifique o status do banco de dados')
    console.log('   - Deve estar "Available"')
    console.log('\n3. Verifique o IP público do servidor:')
    console.log('   - Execute: curl ifconfig.me')
    console.log('   - Use este IP no Security Group do RDS')
    console.log('\n4. Se o RDS está em uma VPC privada:')
    console.log('   - O servidor precisa estar na mesma VPC')
    console.log('   - Ou use um bastion host/VPN')
    process.exit(1)
  }
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    console.log('\n📡 Testando conexão com Prisma...')
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
    
    if (error.code === 'P1001' || error.message.includes("Can't reach")) {
      console.error('\n📋 Diagnóstico: Problema de conectividade de rede')
      console.error('\nSoluções para AWS RDS:')
      console.error('1. Verifique o Security Group do RDS no console AWS')
      console.error('2. Adicione regra permitindo PostgreSQL (porta 5432) do IP do servidor')
      console.error('3. Verifique se o RDS está "Available" no console AWS')
      console.error('4. Se necessário, verifique VPC e Subnets')
    } else if (error.code === 'P1000') {
      console.error('\n📋 Diagnóstico: Credenciais inválidas')
      console.error('Verifique usuário e senha no arquivo .env')
    } else if (error.code === 'P1003') {
      console.error('\n📋 Diagnóstico: Banco de dados não existe')
      console.error('Crie o banco de dados ou verifique o nome na URL')
    } else {
      console.error('\nPossíveis soluções:')
      console.error('1. Verifique se PostgreSQL está rodando')
      console.error('2. Verifique a DATABASE_URL no arquivo .env')
      console.error('3. Verifique se o banco de dados existe')
      console.error('4. Execute: npx prisma migrate dev --name init_postgres')
    }
    process.exit(1)
  }
}

testPostgresConnection()

