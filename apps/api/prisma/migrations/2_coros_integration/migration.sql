-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "corosId" TEXT,
ADD COLUMN "corosName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Activity_corosId_key" ON "Activity"("corosId");

-- AlterTable
ALTER TABLE "DailyHealthMetric" ADD COLUMN "restingHeartRate" INTEGER,
ADD COLUMN "hrv" INTEGER,
ADD COLUMN "avgHeartRate" INTEGER,
ADD COLUMN "stressAvg" INTEGER,
ADD COLUMN "recoveryPct" INTEGER;

-- AlterTable
ALTER TABLE "SleepEntry" ADD COLUMN "score" INTEGER,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE UNIQUE INDEX "SleepEntry_userId_date_source_key" ON "SleepEntry"("userId", "date", "source");

-- CreateTable
CREATE TABLE "CorosOAuthClient" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorosOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorosOAuthState" (
    "state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorosOAuthState_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE INDEX "CorosOAuthState_expiresAt_idx" ON "CorosOAuthState"("expiresAt");

-- CreateTable
CREATE TABLE "CorosToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "corosUserId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorosToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorosToken_userId_key" ON "CorosToken"("userId");

-- AddForeignKey
ALTER TABLE "CorosToken" ADD CONSTRAINT "CorosToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
