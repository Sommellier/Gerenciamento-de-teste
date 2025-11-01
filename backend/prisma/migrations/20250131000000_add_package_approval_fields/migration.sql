-- IMPORTANTE: Os novos valores do enum PackageStatus (EM_TESTE, CONCLUIDO, REPROVADO)
-- devem ser adicionados MANUALMENTE antes de executar esta migration, pois
-- ALTER TYPE ... ADD VALUE não pode ser executado dentro de transação.
--
-- Execute estes comandos no banco de dados ANTES de rodar esta migration:
-- ALTER TYPE "PackageStatus" ADD VALUE 'EM_TESTE';
-- ALTER TYPE "PackageStatus" ADD VALUE 'CONCLUIDO';
-- ALTER TYPE "PackageStatus" ADD VALUE 'REPROVADO';

-- AlterTable TestPackage
ALTER TABLE "TestPackage" ADD COLUMN IF NOT EXISTS "ectUrl" TEXT;
ALTER TABLE "TestPackage" ADD COLUMN IF NOT EXISTS "approvedById" INTEGER;
ALTER TABLE "TestPackage" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "TestPackage" ADD COLUMN IF NOT EXISTS "rejectedById" INTEGER;
ALTER TABLE "TestPackage" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "TestPackage" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- AlterTable TestReport (para suportar relatórios de pacotes)
ALTER TABLE "TestReport" ALTER COLUMN "scenarioId" DROP NOT NULL;
ALTER TABLE "TestReport" ADD COLUMN IF NOT EXISTS "packageId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TestPackage_approvedById_idx" ON "TestPackage"("approvedById");
CREATE INDEX IF NOT EXISTS "TestPackage_rejectedById_idx" ON "TestPackage"("rejectedById");
CREATE INDEX IF NOT EXISTS "TestReport_packageId_idx" ON "TestReport"("packageId");

-- AddForeignKey
ALTER TABLE "TestPackage" DROP CONSTRAINT IF EXISTS "TestPackage_approvedById_fkey";
ALTER TABLE "TestPackage" ADD CONSTRAINT "TestPackage_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestPackage" DROP CONSTRAINT IF EXISTS "TestPackage_rejectedById_fkey";
ALTER TABLE "TestPackage" ADD CONSTRAINT "TestPackage_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestReport" DROP CONSTRAINT IF EXISTS "TestReport_packageId_fkey";
ALTER TABLE "TestReport" ADD CONSTRAINT "TestReport_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TestPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
