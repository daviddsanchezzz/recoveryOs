import { HealthContext } from './health-context';

export const HEALTH_ADVISOR = Symbol('HEALTH_ADVISOR');

export interface HealthAdvisorPort {
  readonly provider: 'openai' | 'local';
  advise(input: { message: string; context: HealthContext }): Promise<string>;
}

export type HealthAdviceResponse = {
  reply: string;
  provider: 'openai' | 'local';
  date: string;
  missingData: string[];
};
