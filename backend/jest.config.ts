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
  testPathIgnorePatterns: ["/node_modules/", "/dist/"]
};

export default config;
