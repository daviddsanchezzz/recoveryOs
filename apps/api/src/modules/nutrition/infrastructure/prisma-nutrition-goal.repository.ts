import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { NutritionGoalEntity } from '../domain/nutrition-goal.entity';
import { NutritionGoalRepositoryPort } from '../domain/nutrition-goal-repository.port';

@Injectable()
export class PrismaNutritionGoalRepository implements NutritionGoalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string): Promise<NutritionGoalEntity | null> {
    const row = await this.prisma.nutritionGoal.findUnique({ where: { userId } });
    if (!row) return null;
    return new NutritionGoalEntity(row.id, row.userId, row.caloriesTarget, row.proteinTarget, row.waterTargetMl);
  }

  async upsert(goal: NutritionGoalEntity): Promise<NutritionGoalEntity> {
    const row = await this.prisma.nutritionGoal.upsert({
      where: { userId: goal.userId },
      update: {
        caloriesTarget: goal.caloriesTarget,
        proteinTarget: goal.proteinTarget,
        waterTargetMl: goal.waterTargetMl,
      },
      create: {
        id: goal.id,
        userId: goal.userId,
        caloriesTarget: goal.caloriesTarget,
        proteinTarget: goal.proteinTarget,
        waterTargetMl: goal.waterTargetMl,
      },
    });
    return new NutritionGoalEntity(row.id, row.userId, row.caloriesTarget, row.proteinTarget, row.waterTargetMl);
  }
}
