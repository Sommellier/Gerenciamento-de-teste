# Configurar New Relic no CI/CD

Este guia explica como configurar os secrets necessários para a integração do New Relic no GitHub Actions.

---

## ✅ O que foi adicionado ao workflow

O workflow `.github/workflows/sonar.yml` agora inclui:

1. **Notify New Relic - Deployment**
   - Marca deployments no New Relic quando há push para `main` ou `master`
   - Rastreia qual versão está em produção
   - Inclui informações do commit e usuário

2. **Verify New Relic Connection**
   - Verifica se a aplicação está conectada ao New Relic
   - Mostra status de saúde da aplicação
   - Útil para validar que o monitoramento está funcionando

---

## 🔑 Configurar Secrets no GitHub

### Passo 1: Obter New Relic API Key

1. Acesse: https://one.newrelic.com
2. Vá em: **Settings** (ícone de engrenagem) → **API Keys**
3. Clique em: **Create API Key**
4. Configure:
   - **Key name:** `GitHub Actions CI/CD`
   - **Type:** `User API Key` ou `Admin API Key`
   - **Note:** Adicione uma descrição (ex: "Para integração com GitHub Actions")
5. Clique em: **Create API Key**
6. **Copie a chave** (ela só aparece uma vez!)

### Passo 2: Obter App ID (Opcional, mas recomendado)

**Opção A: Via Dashboard**
1. Acesse: https://one.newrelic.com
2. Vá em: **APM & Services** → **QAMANAGER**
3. Clique em: **Settings** (ícone de engrenagem)
4. Procure por: **Application ID** ou **ID**
5. Copie o ID

**Opção B: Via API**
```bash
curl -X GET "https://api.newrelic.com/v2/applications.json" \
  -H "Api-Key:SUA_API_KEY_AQUI" \
  -H "Content-Type: application/json" \
  -G -d "filter[name]=QAMANAGER" | jq '.applications[0].id'
```

**Nota:** Se não configurar o App ID, o workflow tentará buscar automaticamente pelo nome "QAMANAGER".

### Passo 3: Adicionar Secrets no GitHub

1. Acesse seu repositório no GitHub
2. Vá em: **Settings** → **Secrets and variables** → **Actions**
3. Clique em: **New repository secret**

**Adicionar `NEW_RELIC_API_KEY`:**
- **Name:** `NEW_RELIC_API_KEY`
- **Secret:** Cole a API Key obtida no Passo 1
- Clique em: **Add secret**

**Adicionar `NEW_RELIC_APP_ID` (opcional):**
- **Name:** `NEW_RELIC_APP_ID`
- **Secret:** Cole o App ID obtido no Passo 2
- Clique em: **Add secret**

---

## 🧪 Testar a Integração

### Teste 1: Fazer um push para main/master

1. Faça um commit e push para a branch `main` ou `master`
2. Vá em: **Actions** no GitHub
3. Veja o workflow executando
4. Procure pelos steps:
   - "Notify New Relic - Deployment"
   - "Verify New Relic Connection"

### Teste 2: Verificar no New Relic

1. Acesse: https://one.newrelic.com
2. Vá em: **APM & Services** → **QAMANAGER**
3. Procure por: **Deployments** (menu lateral ou timeline)
4. Você deve ver o deployment marcado com:
   - Hash do commit
   - Mensagem do commit
   - Usuário que fez o deploy
   - Data/hora

---

## 🔍 O que acontece no workflow

### Quando executa:
- ✅ Push para `main` ou `master`
- ✅ Apenas se `NEW_RELIC_API_KEY` estiver configurado
- ⚠️ Não executa em Pull Requests (apenas em merge para main)

### O que faz:

1. **Notify New Relic:**
   - Busca o App ID (se não estiver configurado, tenta buscar por nome)
   - Envia notificação de deployment para o New Relic
   - Marca o deployment no dashboard

2. **Verify Connection:**
   - Verifica se a aplicação está conectada
   - Mostra status de saúde (green/yellow/red)
   - Exibe informações da aplicação

### Comportamento:
- ✅ **continue-on-error: true** - Não quebra o pipeline se falhar
- ✅ **Busca automática de App ID** - Funciona mesmo sem configurar
- ✅ **Mensagens informativas** - Mostra o que está acontecendo

---

## ⚠️ Troubleshooting

### Problema: "Aplicação QAMANAGER não encontrada"

**Causa:** Aplicação ainda não foi iniciada em produção ou nome diferente.

**Solução:**
1. Verifique se a aplicação está rodando em produção
2. Verifique se o nome no New Relic é exatamente "QAMANAGER"
3. Configure `NEW_RELIC_APP_ID` manualmente no GitHub Secrets

### Problema: "Falha ao notificar New Relic (HTTP 401)"

**Causa:** API Key inválida ou sem permissões.

**Solução:**
1. Verifique se a API Key está correta
2. Certifique-se de que a API Key tem permissão de "Deployments"
3. Crie uma nova API Key se necessário

### Problema: "Falha ao notificar New Relic (HTTP 404)"

**Causa:** App ID incorreto ou aplicação não existe.

**Solução:**
1. Verifique o App ID no dashboard do New Relic
2. Ou remova o `NEW_RELIC_APP_ID` para busca automática
3. Aguarde a aplicação iniciar em produção

### Problema: Steps não aparecem no workflow

**Causa:** Push não foi para `main`/`master` ou API Key não configurada.

**Solução:**
1. Verifique se está na branch correta
2. Verifique se `NEW_RELIC_API_KEY` está configurado
3. Os steps só aparecem em `main`/`master`

---

## 📊 Benefícios

Após configurar, você terá:

1. ✅ **Rastreabilidade:** Ver qual versão está em produção
2. ✅ **Correlação:** Identificar se problemas são causados por deploys
3. ✅ **Histórico:** Timeline completa de deployments
4. ✅ **Monitoramento:** Verificação automática de saúde

---

## 🔗 Links Úteis

- **New Relic API Docs:** https://docs.newrelic.com/docs/apis/rest-api-v2/
- **Deployment API:** https://docs.newrelic.com/docs/apm/new-relic-apm/maintenance/record-monitor-deployments/
- **GitHub Secrets:** https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

**Última atualização:** 2025-01-15

