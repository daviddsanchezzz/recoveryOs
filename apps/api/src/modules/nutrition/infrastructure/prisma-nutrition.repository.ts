import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { NutritionEntryEntity } from '../domain/nutrition-entry.entity';
import { MealType, Quality, Confidence, MealSource } from '../domain/meal-types';
import { NutritionRepositoryPort } from '../domain/nutrition-repository.port';

@Injectable()
export class PrismaNutritionRepository implements NutritionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: {
    id: string; userId: string; consumedAt: Date; rawText: string;
    description: string | null; mealType: string; calories: number;
    proteinGrams: number; carbsGrams: number; fatGrams: number;
    quality: string; confidence: string; source: string;
  }): NutritionEntryEntity {
    return new NutritionEntryEntity(
      row.id, row.userId, row.consumedAt, row.rawText,
      row.calories, row.proteinGrams, row.carbsGrams, row.fatGrams,
      row.mealType as MealType,
      row.description,
      row.quality as Quality,
      row.confidence as Confidence,
      row.source as MealSource,
    );
  }

  async create(entry: NutritionEntryEntity): Promise<NutritionEntryEntity> {
    await this.prisma.user.upsert({
      where: { id: entry.userId },
      update: {},
      create: { id: entry.userId, email: `${entry.userId}@demo.local`, name: 'Demo User' },
    });

    const created = await this.prisma.nutritionLog.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        consumedAt: entry.consumedAt,
        rawText: entry.rawText,
        description: entry.description,
        mealType: entry.mealType,
        calories: entry.calories,
        proteinGrams: entry.proteinGrams,
        carbsGrams: entry.carbsGrams,
        fatGrams: entry.fatGrams,
        quality: entry.quality,
        confidence: entry.confidence,
        source: entry.source,
      },
    });

    return this.map(created);
  }

  async findByUser(userId: string): Promise<NutritionEntryEntity[]> {
    const rows = await this.prisma.nutritionLog.findMany({
      where: { userId },
      orderBy: { consumedAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findByDate(userId: string, date: string): Promise<NutritionEntryEntity[]> {
    const gte = new Date(`${date}T00:00:00.000Z`);
    const lte = new Date(`${date}T23:59:59.999Z`);
    const rows = await this.prisma.nutritionLog.findMany({
      where: { userId, consumedAt: { gte, lte } },
      orderBy: { consumedAt: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<NutritionEntryEntity | null> {
    const row = await this.prisma.nutritionLog.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async update(
    id: string,
    fields: Partial<Pick<NutritionEntryEntity,
      'mealType' | 'description' | 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams' | 'quality'
    >>,
  ): Promise<NutritionEntryEntity> {
    const updated = await this.prisma.nutritionLog.update({
      where: { id },
      data: {
        ...(fields.mealType     !== undefined && { mealType: fields.mealType }),
        ...(fields.description  !== undefined && { description: fields.description }),
        ...(fields.calories     !== undefined && { calories: fields.calories }),
        ...(fields.proteinGrams !== undefined && { proteinGrams: fields.proteinGrams }),
        ...(fields.carbsGrams   !== undefined && { carbsGrams: fields.carbsGrams }),
        ...(fields.fatGrams     !== undefined && { fatGrams: fields.fatGrams }),
        ...(fields.quality      !== undefined && { quality: fields.quality }),
      },
    });
    return this.map(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.nutritionLog.delete({ where: { id } });
  }
}
