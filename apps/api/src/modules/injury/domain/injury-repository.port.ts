import { InjuryEntity, InjuryStatus } from './injury.entity';
import { InjuryLogEntity } from './injury-log.entity';

export const INJURY_REPOSITORY = 'INJURY_REPOSITORY';

export interface InjuryRepositoryPort {
  createInjury(injury: InjuryEntity): Promise<InjuryEntity>;
  findInjuriesByUser(userId: string): Promise<(InjuryEntity & { logs: InjuryLogEntity[] })[]>;
  updateInjury(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      bodyPart: string;
      description: string;
      startDate: Date;
      status: InjuryStatus;
    }>,
  ): Promise<InjuryEntity | null>;
  deleteInjury(id: string, userId: string): Promise<boolean>;

  createLog(log: InjuryLogEntity): Promise<InjuryLogEntity>;
  findLogsByInjury(injuryId: string): Promise<InjuryLogEntity[]>;
  findLogsByUser(userId: string): Promise<InjuryLogEntity[]>;
  deleteLog(id: string, userId: string): Promise<boolean>;
}
