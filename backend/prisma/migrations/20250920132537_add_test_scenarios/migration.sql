-- CreateEnum
CREATE TYPE "ScenarioType" AS ENUM ('FUNCTIONAL', 'REGRESSION', 'SMOKE', 'E2E');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEV', 'QA', 'STAGING', 'PROD');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('CREATED', 'EXECUTED', 'PASSED', 'FAILED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT;

-- CreateTable
CREATE TABLE "TestScenario" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "type" "ScenarioType" NOT NULL,
    "priority" "Priority" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assigneeEmail" TEXT,
    "environment" "Environment",
    "release" VARCHAR(7) NOT NULL,
    "status" "ScenarioStatus" NOT NULL DEFAULT 'CREATED',
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestScenarioStep" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "scenarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestScenarioStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestScenario_projectId_idx" ON "TestScenario"("projectId");

-- CreateIndex
CREATE INDEX "TestScenario_projectId_release_idx" ON "TestScenario"("projectId", "release");

-- CreateIndex
CREATE INDEX "TestScenario_status_idx" ON "TestScenario"("status");

-- CreateIndex
CREATE INDEX "TestScenario_assigneeEmail_idx" ON "TestScenario"("assigneeEmail");

-- CreateIndex
CREATE INDEX "TestScenarioStep_scenarioId_stepOrder_idx" ON "TestScenarioStep"("scenarioId", "stepOrder");

-- AddForeignKey
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScenarioStep" ADD CONSTRAINT "TestScenarioStep_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
