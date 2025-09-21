-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('CREATED', 'EXECUTED', 'PASSED', 'FAILED');

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TestScenario" ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "release" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "TestPackage" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ScenarioType" NOT NULL,
    "priority" "Priority" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assigneeEmail" TEXT,
    "environment" "Environment",
    "release" TEXT NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'CREATED',
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPackageStep" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "packageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPackageStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestPackage_projectId_idx" ON "TestPackage"("projectId");

-- CreateIndex
CREATE INDEX "TestPackage_projectId_release_idx" ON "TestPackage"("projectId", "release");

-- CreateIndex
CREATE INDEX "TestPackage_status_idx" ON "TestPackage"("status");

-- CreateIndex
CREATE INDEX "TestPackage_assigneeEmail_idx" ON "TestPackage"("assigneeEmail");

-- CreateIndex
CREATE INDEX "TestPackageStep_packageId_stepOrder_idx" ON "TestPackageStep"("packageId", "stepOrder");

-- AddForeignKey
ALTER TABLE "TestPackage" ADD CONSTRAINT "TestPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPackageStep" ADD CONSTRAINT "TestPackageStep_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TestPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
