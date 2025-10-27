# Script de Migração: SQLite → PostgreSQL (Windows PowerShell)
# Uso: .\migrate-to-postgres.ps1

Write-Host "🚀 Iniciando migração para PostgreSQL..." -ForegroundColor Green
Write-Host ""

# Verificar se está no diretório correto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script a partir do diretório backend/" -ForegroundColor Red
    exit 1
}

# Passo 1: Verificar PostgreSQL instalado
Write-Host "📋 Verificando PostgreSQL..." -ForegroundColor Yellow
$psqlExists = Get-Command psql -ErrorAction SilentlyContinue
if (!$psqlExists) {
    Write-Host "❌ PostgreSQL não encontrado!" -ForegroundColor Red
    Write-Host "Instale PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ PostgreSQL encontrado" -ForegroundColor Green
Write-Host ""

# Passo 2: Verificar se DATABASE_URL está configurada
Write-Host "📋 Verificando variáveis de ambiente..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "⚠️  Arquivo .env não encontrado" -ForegroundColor Yellow
    if (Test-Path "env.example.txt") {
        Copy-Item "env.example.txt" ".env"
        Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
    } else {
        Write-Host "❌ env.example.txt não encontrado" -ForegroundColor Red
        exit 1
    }
}

$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "postgresql") {
    Write-Host "❌ DATABASE_URL não configurada para PostgreSQL!" -ForegroundColor Red
    Write-Host "Configure DATABASE_URL no arquivo .env" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Variáveis de ambiente configuradas" -ForegroundColor Green
Write-Host ""

# Passo 3: Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
$pgInstalled = npm list pg --depth=0 2>$null
if (!$pgInstalled) {
    Write-Host "Instalando pg..." -ForegroundColor Yellow
    npm install pg @types/pg
}
Write-Host "✅ Dependências instaladas" -ForegroundColor Green
Write-Host ""

# Passo 4: Atualizar schema.prisma
Write-Host "📝 Atualizando schema.prisma..." -ForegroundColor Yellow
$schemaContent = Get-Content "prisma\schema.prisma" -Raw
if ($schemaContent -match 'provider = "sqlite"') {
    Write-Host "Atualizando provider para postgresql..." -ForegroundColor Yellow
    
    # Fazer backup
    Copy-Item "prisma\schema.prisma" "prisma\schema.prisma.bak"
    
    # Atualizar content
    $schemaContent = $schemaContent -replace 'provider = "sqlite"', 'provider = "postgresql"'
    $schemaContent = $schemaContent -replace 'url      = "file:./dev.db"', 'url      = env("DATABASE_URL")'
    
    Set-Content -Path "prisma\schema.prisma" -Value $schemaContent
    Write-Host "✅ Schema atualizado" -ForegroundColor Green
} else {
    Write-Host "✅ Schema já está configurado para PostgreSQL" -ForegroundColor Green
}
Write-Host ""

# Passo 5: Gerar cliente Prisma
Write-Host "🏗️  Gerando cliente Prisma..." -ForegroundColor Yellow
npm run prisma:generate
Write-Host "✅ Cliente Prisma gerado" -ForegroundColor Green
Write-Host ""

# Passo 6: Executar migrações
Write-Host "📊 Executando migrações..." -ForegroundColor Yellow
$response = Read-Host "Deseja executar as migrações agora? (s/n)"
if ($response -eq "s" -or $response -eq "S") {
    npx prisma migrate dev --name init_postgres
    Write-Host "✅ Migrações executadas" -ForegroundColor Green
} else {
    Write-Host "⚠️  Migrações não executadas. Execute manualmente:" -ForegroundColor Yellow
    Write-Host "npx prisma migrate dev --name init_postgres" -ForegroundColor Yellow
}
Write-Host ""

# Passo 7: Resumo
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Migração concluída!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Execute: npx prisma migrate dev --name init_postgres"
Write-Host "2. Teste a aplicação: npm run dev"
Write-Host "3. Visualize o banco: npx prisma studio"
Write-Host ""
Write-Host "Para produção:" -ForegroundColor Yellow
Write-Host "1. Configure variáveis de ambiente"
Write-Host "2. Execute: npx prisma migrate deploy"
Write-Host "3. Configure backups automáticos"
Write-Host ""

