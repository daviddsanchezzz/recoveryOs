import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthMetricsController } from './health-metrics.controller';
import { HealthMetricsService } from './health-metrics.service';

@Module({
  imports: [AuthModule],
  controllers: [HealthMetricsController],
  providers: [HealthMetricsService],
  exports: [HealthMetricsService],
})
export class HealthMetricsModule {}
