export const AI_INTENT_PARSER = Symbol('AI_INTENT_PARSER');

export type ParsedChatIntent =
  | {
      type: 'weight';
      payload: { weightKg: number; date: Date };
      reply: string;
    }
  | {
      type: 'injury';
      payload: {
        walkingPain: number;
        stiffness: number;
        swelling: boolean;
        rehabCompleted: boolean;
        notes?: string;
        date: Date;
      };
      reply: string;
    }
  | {
      type: 'nutrition';
      payload: {
        consumedAt: Date;
        rawText: string;
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      };
      reply: string;
    }
  | {
      type: 'activity';
      payload: {
        type: string;
        durationMin: number;
        distanceKm?: number;
      };
      reply: string;
    }
  | {
      type: 'unknown';
      reply: string;
    };

export interface AiIntentParserPort {
  parse(input: { userId: string; message: string; now: Date }): Promise<ParsedChatIntent>;
}

