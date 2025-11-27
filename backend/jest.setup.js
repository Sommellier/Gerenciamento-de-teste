require('dotenv').config({ path: '.env' });

// Configurar variáveis de ambiente para testes se não existirem
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

// Não mockar file-type aqui - será tratado no código

// Mock DOMPurify e jsdom para evitar problemas de ESM
const mockSanitize = (input) => {
  if (typeof input !== 'string') return '';
  // Sanitização básica para testes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
};

// Mock dompurify
jest.mock('dompurify', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      sanitize: mockSanitize
    }))
  };
}, { virtual: false });

// Mock jsdom
jest.mock('jsdom', () => {
  return {
    JSDOM: jest.fn(() => ({
      window: {
        document: {
          createElement: () => ({})
        }
      }
    }))
  };
}, { virtual: false });