import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDate, IsInt, IsNumber, IsOptional,
  IsString, Min,
} from 'class-validator';

export class LogActivityDto {
  @IsOptional() @IsString()
  id?: string;

  @IsString()
  userId!: string;

  @IsString()
  type!: string;

  @IsString()
  source!: string;

  @Type(() => Date)
  @IsDate()
  performedAt!: Date;

  // Common
  @IsOptional() @IsInt() @Min(0)
  durationMin?: number;

  @IsOptional() @IsInt() @Min(0)
  calories?: number;

  @IsOptional() @IsInt() @Min(0)
  avgHeartRate?: number;

  @IsOptional() @IsInt() @Min(0)
  maxHeartRate?: number;

  @IsOptional() @IsString()
  notes?: string;

  // Distance
  @IsOptional() @IsNumber() @Min(0)
  distanceKm?: number;

  @IsOptional() @IsNumber() @Min(0)
  elevationGainM?: number;

  // Run / Walk
  @IsOptional() @IsNumber() @Min(0)
  avgPaceSecPerKm?: number;

  @IsOptional() @IsInt() @Min(0)
  avgCadenceSpm?: number;

  // Bike
  @IsOptional() @IsNumber() @Min(0)
  avgSpeedKmh?: number;

  @IsOptional() @IsInt() @Min(0)
  avgPowerW?: number;

  @IsOptional() @IsInt() @Min(0)
  avgCadenceRpm?: number;

  @IsOptional() @IsNumber() @Min(0)
  kilojoules?: number;

  // Swim
  @IsOptional() @IsInt() @Min(0)
  distanceM?: number;

  @IsOptional() @IsInt() @Min(0)
  avgPace100mSec?: number;

  // Gym
  @IsOptional() @IsArray() @IsString({ each: true })
  muscleGroups?: string[];

  @IsOptional() @IsNumber() @Min(0)
  totalVolumeKg?: number;

  // Strava
  @IsOptional() @IsString()
  stravaId?: string;

  @IsOptional() @IsString()
  stravaName?: string;

  // Race flag
  @IsOptional() @IsBoolean()
  isRace?: boolean;
}
