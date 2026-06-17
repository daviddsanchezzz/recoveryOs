import { Controller, Get, Param } from '@nestjs/common';
import { GetDashboardUseCase } from '../application/use-cases/get-dashboard.use-case';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboardUseCase: GetDashboardUseCase) {}

  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.getDashboardUseCase.execute(userId);
  }
}

