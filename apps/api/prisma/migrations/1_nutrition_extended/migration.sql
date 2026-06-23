-- AlterTable
ALTER TABLE "NutritionLog" ADD COLUMN "description" TEXT,
ADD COLUMN "mealType" TEXT NOT NULL DEFAULT 'snack',
ADD COLUMN "quality" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN "confidence" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE INDEX "NutritionLog_userId_consumedAt_idx" ON "NutritionLog"("userId", "consumedAt");

-- CreateTable
CREATE TABLE "NutritionGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caloriesTarget" INTEGER NOT NULL DEFAULT 2300,
    "proteinTarget" INTEGER NOT NULL DEFAULT 150,
    "waterTargetMl" INTEGER,

    CONSTRAINT "NutritionGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionGoal_userId_key" ON "NutritionGoal"("userId");

-- AddForeignKey
ALTER TABLE "NutritionGoal" ADD CONSTRAINT "NutritionGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
