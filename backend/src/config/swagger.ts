import swaggerJsdoc from 'swagger-jsdoc'

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API - Gerenciamento de Testes',
    version: '1.0.0',
    description: `
# 🚨 Ambiente de Demonstração

**Este é um ambiente de demonstração para fins de portfólio.**

⚠️ **IMPORTANTE:**
- Este ambiente contém apenas **dados fictícios** para demonstração
- Não utilize dados reais ou informações sensíveis
- Endpoints destrutivos (DELETE, PUT) exigem autenticação JWT mesmo na documentação
- Este ambiente é monitorado e pode ser reiniciado a qualquer momento

## 🔐 Credenciais de Teste

Para testar a API, você pode usar as seguintes credenciais de demonstração:

**Email:** \`qa.teste@exemplo.com\`  
**Senha:** \`Senha123!\`

> ⚠️ **Nota:** Estas credenciais são apenas para demonstração. Não utilize em produção.

## 📚 Documentação

Esta documentação descreve todos os endpoints disponíveis na API de gerenciamento de testes de software.

### Segurança

- Todos os endpoints que modificam dados exigem autenticação JWT
- Tokens CSRF são necessários para operações sensíveis
- Rate limiting está ativo para prevenir abuso
- Senhas são criptografadas usando bcrypt
- Comunicação deve ser feita via HTTPS em produção

### Como Usar

1. Obtenha um token CSRF através de \`GET /api/csrf-token\`
2. Faça login através de \`POST /api/login\` usando as credenciais acima
3. Use o \`accessToken\` retornado para autenticar requisições subsequentes
4. Para renovar o token, use \`POST /api/refresh-token\` com o \`refreshToken\`

---

**Desenvolvido para fins acadêmicos e portfólio profissional.**
    `,
    contact: {
      name: 'Suporte API',
      email: 'suporte@exemplo.com'
    }
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:3000',
      description: 'Servidor de demonstração (ambiente de teste)'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido através do endpoint /api/login. Use as credenciais de teste: qa.teste@exemplo.com / Senha123!'
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-csrf-token',
        description: 'Token CSRF obtido através do endpoint /api/csrf-token'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Mensagem de erro'
          },
          message: {
            type: 'string',
            description: 'Descrição detalhada do erro'
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID único do usuário'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email do usuário'
          },
          name: {
            type: 'string',
            description: 'Nome completo do usuário'
          },
          role: {
            type: 'string',
            enum: ['ADMIN', 'USER'],
            description: 'Papel do usuário no sistema'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Data de criação do usuário'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Data da última atualização'
          }
        }
      },
      Project: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID único do projeto'
          },
          name: {
            type: 'string',
            description: 'Nome do projeto'
          },
          description: {
            type: 'string',
            description: 'Descrição do projeto'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Autenticação',
      description: 'Endpoints relacionados à autenticação e autorização'
    },
    {
      name: 'Usuários',
      description: 'Gerenciamento de usuários'
    },
    {
      name: 'Projetos',
      description: 'Gerenciamento de projetos'
    },
    {
      name: 'Cenários',
      description: 'Gerenciamento de cenários de teste'
    },
    {
      name: 'Pacotes',
      description: 'Gerenciamento de pacotes de teste'
    },
    {
      name: 'Execuções',
      description: 'Gerenciamento de execuções de teste'
    },
    {
      name: 'Membros',
      description: 'Gerenciamento de membros do projeto'
    },
    {
      name: 'Convites',
      description: 'Gerenciamento de convites para projetos'
    },
    {
      name: 'Upload',
      description: 'Upload de arquivos'
    },
    {
      name: 'Perfil',
      description: 'Gerenciamento de perfil do usuário'
    }
  ]
}

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/**/*.ts'
  ]
}

export const swaggerSpec = swaggerJsdoc(options)

