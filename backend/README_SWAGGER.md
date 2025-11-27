# 📚 Swagger - Documentação da API

## 🚀 Acesso Rápido

Após iniciar o servidor, acesse:

```
http://localhost:3000/api-docs
```

## 🔐 Credenciais

### Swagger UI (Basic Auth)
- **Usuário:** `admin`
- **Senha:** `admin123`

### API (usuário de teste)
- **Email:** `qa.teste@exemplo.com`
- **Senha:** `Senha123!`

## 📖 Como Usar

1. Acesse `http://localhost:3000/api-docs`
2. Autentique com Basic Auth (admin/admin123)
3. Obtenha token CSRF: `GET /api/csrf-token`
4. Faça login: `POST /api/login` com as credenciais acima
5. Clique em "Authorize" e cole o `accessToken`
6. Teste os endpoints!

## 📚 Documentação Completa

Para documentação detalhada, consulte: [`docs/SWAGGER.md`](../docs/SWAGGER.md)

