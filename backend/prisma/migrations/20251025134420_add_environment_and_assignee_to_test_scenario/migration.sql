-- AlterTable
ALTER TABLE "TestScenario" ADD COLUMN "assigneeEmail" TEXT;
ALTER TABLE "TestScenario" ADD COLUMN "environment" TEXT;

-- CreateIndex
CREATE INDEX "TestScenario_environment_idx" ON "TestScenario"("environment");

-- CreateIndex
CREATE INDEX "TestScenario_assigneeEmail_idx" ON "TestScenario"("assigneeEmail");
