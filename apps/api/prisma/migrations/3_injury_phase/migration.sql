-- AlterTable
ALTER TABLE "Injury" ADD COLUMN "phaseLabel" TEXT,
ADD COLUMN "phaseStartDate" TIMESTAMP(3),
ADD COLUMN "phaseTargetSessions" INTEGER;
