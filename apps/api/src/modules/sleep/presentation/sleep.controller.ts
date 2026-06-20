import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { LogSleepDto } from '../application/dto/log-sleep.dto';
import { UpdateSleepDto } from '../application/dto/update-sleep.dto';
import { DeleteSleepUseCase } from '../application/use-cases/delete-sleep.use-case';
import { GetUserSleepUseCase } from '../application/use-cases/get-user-sleep.use-case';
import { LogSleepUseCase } from '../application/use-cases/log-sleep.use-case';
import { UpdateSleepUseCase } from '../application/use-cases/update-sleep.use-case';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';

@Controller('sleep')
export class SleepController {
  constructor(
    private readonly logSleep: LogSleepUseCase,
    private readonly getUserSleep: GetUserSleepUseCase,
    private readonly updateSleep: UpdateSleepUseCase,
    private readonly deleteSleep: DeleteSleepUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
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
  async update(@Param('id') id: string, @Body() body: UpdateSleepDto, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return this.updateSleep.execute(id, session.user.id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return this.deleteSleep.execute(id, session.user.id);
  }
}
