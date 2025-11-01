-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'TESTER', 'APPROVER');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'APPROVED', 'REPROVED');

-- CreateEnum
CREATE TYPE "ScenarioType" AS ENUM ('FUNCTIONAL', 'REGRESSION', 'SMOKE', 'E2E');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEV', 'QA', 'STAGING', 'PROD');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('CREATED', 'EXECUTED', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('CREATED', 'EXECUTED', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StepExecutionStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOnProject" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "UserOnProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "precondition" TEXT,
    "steps" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" SERIAL NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "testCaseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "executionId" INTEGER,
    "testCaseId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInvite" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestScenario" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ScenarioType" NOT NULL,
    "priority" "Priority" NOT NULL,
    "tags" TEXT,
    "status" "ScenarioStatus" NOT NULL DEFAULT 'CREATED',
    "release" TEXT,
    "environment" "Environment",
    "assigneeEmail" TEXT,
    "projectId" INTEGER NOT NULL,
    "packageId" INTEGER,
    "testadorId" INTEGER,
    "aprovadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestScenarioStep" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "actualResult" TEXT,
    "status" "StepExecutionStatus" DEFAULT 'PENDING',
    "stepOrder" INTEGER NOT NULL,
    "scenarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestScenarioStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPackage" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ScenarioType" NOT NULL,
    "priority" "Priority" NOT NULL,
    "tags" TEXT,
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

-- CreateTable
CREATE TABLE "StepComment" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "mentions" TEXT,
    "stepId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepAttachment" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "stepId" INTEGER NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioExecutionHistory" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "scenarioId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioExecutionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bug" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "BugSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "scenarioId" INTEGER NOT NULL,
    "relatedStepId" INTEGER,
    "projectId" INTEGER NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestReport" (
    "id" SERIAL NOT NULL,
    "scenarioId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestReportApproval" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "comment" TEXT,
    "approvedBy" INTEGER NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileHash" TEXT NOT NULL,
    "verificationUrl" TEXT,

    CONSTRAINT "TestReportApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "project_owner_name_unique" ON "Project"("ownerId", "name");

-- CreateIndex
CREATE INDEX "UserOnProject_role_idx" ON "UserOnProject"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserOnProject_userId_projectId_key" ON "UserOnProject"("userId", "projectId");

-- CreateIndex
CREATE INDEX "TestCase_projectId_idx" ON "TestCase"("projectId");

-- CreateIndex
CREATE INDEX "Execution_testCaseId_executedAt_idx" ON "Execution"("testCaseId", "executedAt");

-- CreateIndex
CREATE INDEX "Evidence_executionId_idx" ON "Evidence"("executionId");

-- CreateIndex
CREATE INDEX "Evidence_testCaseId_idx" ON "Evidence"("testCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_token_key" ON "ProjectInvite"("token");

-- CreateIndex
CREATE INDEX "ProjectInvite_projectId_email_idx" ON "ProjectInvite"("projectId", "email");

-- CreateIndex
CREATE INDEX "ProjectInvite_status_idx" ON "ProjectInvite"("status");

-- CreateIndex
CREATE INDEX "TestScenario_projectId_idx" ON "TestScenario"("projectId");

-- CreateIndex
CREATE INDEX "TestScenario_packageId_idx" ON "TestScenario"("packageId");

-- CreateIndex
CREATE INDEX "TestScenario_status_idx" ON "TestScenario"("status");

-- CreateIndex
CREATE INDEX "TestScenario_testadorId_idx" ON "TestScenario"("testadorId");

-- CreateIndex
CREATE INDEX "TestScenario_aprovadorId_idx" ON "TestScenario"("aprovadorId");

-- CreateIndex
CREATE INDEX "TestScenario_release_idx" ON "TestScenario"("release");

-- CreateIndex
CREATE INDEX "TestScenario_environment_idx" ON "TestScenario"("environment");

-- CreateIndex
CREATE INDEX "TestScenario_assigneeEmail_idx" ON "TestScenario"("assigneeEmail");

-- CreateIndex
CREATE INDEX "TestScenarioStep_scenarioId_idx" ON "TestScenarioStep"("scenarioId");

-- CreateIndex
CREATE INDEX "TestScenarioStep_scenarioId_stepOrder_idx" ON "TestScenarioStep"("scenarioId", "stepOrder");

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

-- CreateIndex
CREATE INDEX "StepComment_stepId_idx" ON "StepComment"("stepId");

-- CreateIndex
CREATE INDEX "StepComment_userId_idx" ON "StepComment"("userId");

-- CreateIndex
CREATE INDEX "StepAttachment_stepId_idx" ON "StepAttachment"("stepId");

-- CreateIndex
CREATE INDEX "ScenarioExecutionHistory_scenarioId_idx" ON "ScenarioExecutionHistory"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioExecutionHistory_userId_idx" ON "ScenarioExecutionHistory"("userId");

-- CreateIndex
CREATE INDEX "ScenarioExecutionHistory_action_idx" ON "ScenarioExecutionHistory"("action");

-- CreateIndex
CREATE INDEX "Bug_scenarioId_idx" ON "Bug"("scenarioId");

-- CreateIndex
CREATE INDEX "Bug_projectId_idx" ON "Bug"("projectId");

-- CreateIndex
CREATE INDEX "Bug_status_idx" ON "Bug"("status");

-- CreateIndex
CREATE INDEX "Bug_severity_idx" ON "Bug"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "TestReport_checksum_key" ON "TestReport"("checksum");

-- CreateIndex
CREATE INDEX "TestReport_scenarioId_idx" ON "TestReport"("scenarioId");

-- CreateIndex
CREATE INDEX "TestReport_checksum_idx" ON "TestReport"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "TestReportApproval_reportId_key" ON "TestReportApproval"("reportId");

-- CreateIndex
CREATE INDEX "TestReportApproval_reportId_idx" ON "TestReportApproval"("reportId");

-- CreateIndex
CREATE INDEX "TestReportApproval_approvedBy_idx" ON "TestReportApproval"("approvedBy");

-- CreateIndex
CREATE INDEX "TestReportApproval_status_idx" ON "TestReportApproval"("status");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOnProject" ADD CONSTRAINT "UserOnProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOnProject" ADD CONSTRAINT "UserOnProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TestPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_testadorId_fkey" FOREIGN KEY ("testadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScenarioStep" ADD CONSTRAINT "TestScenarioStep_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPackage" ADD CONSTRAINT "TestPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPackageStep" ADD CONSTRAINT "TestPackageStep_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TestPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepComment" ADD CONSTRAINT "StepComment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "TestScenarioStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepComment" ADD CONSTRAINT "StepComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepAttachment" ADD CONSTRAINT "StepAttachment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "TestScenarioStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepAttachment" ADD CONSTRAINT "StepAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioExecutionHistory" ADD CONSTRAINT "ScenarioExecutionHistory_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioExecutionHistory" ADD CONSTRAINT "ScenarioExecutionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReport" ADD CONSTRAINT "TestReport_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReportApproval" ADD CONSTRAINT "TestReportApproval_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TestReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReportApproval" ADD CONSTRAINT "TestReportApproval_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
