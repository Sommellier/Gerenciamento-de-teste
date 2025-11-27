import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx,js,jsx}",
    "!src/**/*.d.ts",
    "!src/**/migrations/**",
    "!src/**/prisma/**",
    "!src/tests/**",
    "!src/main.ts"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text-summary"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testTimeout: 30000,
  silent: true,
  verbose: false,
  transformIgnorePatterns: [
    "node_modules/(?!(jsdom|dompurify|file-type|parse5)/)"
  ],
  moduleNameMapper: {
    "^dompurify$": "<rootDir>/node_modules/dompurify/dist/purify.cjs",
    "^jsdom$": "<rootDir>/node_modules/jsdom/lib/api.js"
  },
  extensionsToTreatAsEsm: []
};

export default config;
