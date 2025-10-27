-- AlterTable
ALTER TABLE "TestScenario" ADD COLUMN "release" TEXT;

-- CreateIndex
CREATE INDEX "TestScenario_release_idx" ON "TestScenario"("release");
