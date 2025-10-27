#!/bin/bash

# Script de Migração: SQLite → PostgreSQL
# Uso: ./migrate-to-postgres.sh

echo "🚀 Iniciando migração para PostgreSQL..."
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir do diretório backend/"
    exit 1
fi

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Passo 1: Verificar PostgreSQL instalado
echo "📋 Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL não encontrado!${NC}"
    echo "Instale PostgreSQL: https://www.postgresql.org/download/"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL encontrado${NC}"
echo ""

# Passo 2: Verificar se DATABASE_URL está configurada
echo "📋 Verificando variáveis de ambiente..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
    echo "Criando .env a partir de env.example.txt..."
    if [ -f "env.example.txt" ]; then
        cp env.example.txt .env
        echo -e "${GREEN}✅ Arquivo .env criado${NC}"
    else
        echo -e "${RED}❌ env.example.txt não encontrado${NC}"
        exit 1
    fi
fi

if ! grep -q "postgresql" .env; then
    echo -e "${RED}❌ DATABASE_URL não configurada para PostgreSQL!${NC}"
    echo "Configure DATABASE_URL no arquivo .env"
    exit 1
fi
echo -e "${GREEN}✅ Variáveis de ambiente configuradas${NC}"
echo ""

# Passo 3: Instalar dependências
echo "📦 Instalando dependências..."
if ! npm list pg &> /dev/null; then
    echo "Instalando pg..."
    npm install pg @types/pg
fi
echo -e "${GREEN}✅ Dependências instaladas${NC}"
echo ""

# Passo 4: Atualizar schema.prisma
echo "📝 Atualizando schema.prisma..."
if grep -q 'provider = "sqlite"' prisma/schema.prisma; then
    echo "Atualizando provider para postgresql..."
    sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
    sed -i.bak 's|url      = "file:./dev.db"|url      = env("DATABASE_URL")|' prisma/schema.prisma
    echo -e "${GREEN}✅ Schema atualizado${NC}"
else
    echo -e "${GREEN}✅ Schema já está configurado para PostgreSQL${NC}"
fi
echo ""

# Passo 5: Gerar cliente Prisma
echo "🏗️  Gerando cliente Prisma..."
npm run prisma:generate
echo -e "${GREEN}✅ Cliente Prisma gerado${NC}"
echo ""

# Passo 6: Executar migrações
echo "📊 Executando migrações..."
read -p "Deseja executar as migrações agora? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    npx prisma migrate dev --name init_postgres
    echo -e "${GREEN}✅ Migrações executadas${NC}"
else
    echo -e "${YELLOW}⚠️  Migrações não executadas. Execute manualmente:${NC}"
    echo "npx prisma migrate dev --name init_postgres"
fi
echo ""

# Passo 7: Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Migração concluída!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Próximos passos:"
echo "1. Execute: npx prisma migrate dev --name init_postgres"
echo "2. Teste a aplicação: npm run dev"
echo "3. Visualize o banco: npx prisma studio"
echo ""
echo "Para produção:"
echo "1. Configure variáveis de ambiente"
echo "2. Execute: npx prisma migrate deploy"
echo "3. Configure backups automáticos"
echo ""

