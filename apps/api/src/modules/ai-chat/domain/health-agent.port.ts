import { HealthContext } from './health-context';

export const HEALTH_AGENT = Symbol('HEALTH_AGENT');

export type HealthAgentResult =
  | { intent: 'advice'; reply: string; confidence: number }
  | { intent: 'clarification'; reply: string; confidence: number }
  | {
      intent: 'weight';
      reply: string;
      confidence: number;
      payload: { weightKg: number; date: Date };
    }
  | {
      intent: 'injury';
      reply: string;
      confidence: number;
      payload: {
        injuryName: string | null;
        painLevel: number;
        didRehab: boolean;
        notes?: string;
        date: Date;
      };
    }
  | {
      intent: 'nutrition';
      reply: string;
      confidence: number;
      payload: {
        consumedAt: Date;
        rawText: string;
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      };
    }
  | {
      intent: 'activity';
      reply: string;
      confidence: number;
      payload: {
        type: string;
        durationMin: number;
        distanceKm?: number;
        notes?: string;
        performedAt: Date;
      };
    };

export interface HealthAgentPort {
  respond(input: {
    message: string;
    date: string;
    context: HealthContext;
  }): Promise<HealthAgentResult>;
}
