import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { LogSleepDto } from '../application/dto/log-sleep.dto';
import { UpdateSleepDto } from '../application/dto/update-sleep.dto';
import { DeleteSleepUseCase } from '../application/use-cases/delete-sleep.use-case';
import { GetUserSleepUseCase } from '../application/use-cases/get-user-sleep.use-case';
import { LogSleepUseCase } from '../application/use-cases/log-sleep.use-case';
import { UpdateSleepUseCase } from '../application/use-cases/update-sleep.use-case';

@Controller('sleep')
export class SleepController {
  constructor(
    private readonly logSleep: LogSleepUseCase,
    private readonly getUserSleep: GetUserSleepUseCase,
    private readonly updateSleep: UpdateSleepUseCase,
    private readonly deleteSleep: DeleteSleepUseCase,
  ) {}

  @Post()
  create(@Body() body: LogSleepDto) {
    return this.logSleep.execute(body);
  }

  @Get(':userId')
  getAll(@Param('userId') userId: string) {
    return this.getUserSleep.execute(userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateSleepDto) {
    return this.updateSleep.execute(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deleteSleep.execute(id);
  }
}
