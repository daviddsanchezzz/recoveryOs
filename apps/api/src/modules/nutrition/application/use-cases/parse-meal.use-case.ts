import { Inject, Injectable } from '@nestjs/common';
import {
  NUTRITION_AI_PARSER,
  NutritionAiParserPort,
  ParsedMealResult,
} from '../../domain/nutrition-ai-parser.port';
import { ParseMealDto } from '../dto/parse-meal.dto';

@Injectable()
export class ParseMealUseCase {
  constructor(
    @Inject(NUTRITION_AI_PARSER)
    private readonly parser: NutritionAiParserPort,
  ) {}

  execute(input: ParseMealDto): Promise<ParsedMealResult> {
    const date = input.date ? new Date(`${input.date}T12:00:00.000Z`) : new Date();
    return this.parser.parseMeal(input.text, date);
  }
}
