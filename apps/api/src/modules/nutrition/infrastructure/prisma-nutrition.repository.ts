import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { NutritionEntryEntity } from '../domain/nutrition-entry.entity';
import { NutritionRepositoryPort } from '../domain/nutrition-repository.port';

@Injectable()
export class PrismaNutritionRepository implements NutritionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: NutritionEntryEntity): Promise<NutritionEntryEntity> {
    await this.prisma.user.upsert({
      where: { id: entry.userId },
      update: {},
      create: {
        id: entry.userId,
        email: `${entry.userId}@demo.local`,
        name: 'Demo User',
      },
    });

    const created = await this.prisma.nutritionLog.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        consumedAt: entry.consumedAt,
        rawText: entry.rawText,
        calories: entry.calories,
        proteinGrams: entry.proteinGrams,
        carbsGrams: entry.carbsGrams,
        fatGrams: entry.fatGrams,
      },
    });

    return new NutritionEntryEntity(
      created.id,
      created.userId,
      created.consumedAt,
      created.rawText,
      created.calories,
      created.proteinGrams,
      created.carbsGrams,
      created.fatGrams,
    );
  }

  async findByUser(userId: string): Promise<NutritionEntryEntity[]> {
    const entries = await this.prisma.nutritionLog.findMany({
      where: { userId },
      orderBy: { consumedAt: 'desc' },
    });

    return entries.map(
      (entry) =>
        new NutritionEntryEntity(
          entry.id,
          entry.userId,
          entry.consumedAt,
          entry.rawText,
          entry.calories,
          entry.proteinGrams,
          entry.carbsGrams,
          entry.fatGrams,
        ),
    );
  }
}

