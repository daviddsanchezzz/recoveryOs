import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { CreateInjuryDto } from '../application/dto/create-injury.dto';
import { LogPainDto } from '../application/dto/log-pain.dto';
import { UpdateInjuryDto } from '../application/dto/update-injury.dto';
import { CreateInjuryUseCase } from '../application/use-cases/create-injury.use-case';
import { DeleteInjuryLogUseCase } from '../application/use-cases/delete-injury-log.use-case';
import { DeleteInjuryUseCase } from '../application/use-cases/delete-injury.use-case';
import { GetUserInjuriesUseCase } from '../application/use-cases/get-user-injuries.use-case';
import { LogPainUseCase } from '../application/use-cases/log-pain.use-case';
import { UpdateInjuryUseCase } from '../application/use-cases/update-injury.use-case';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';

@Controller('injuries')
export class InjuryController {
  constructor(
    private readonly createInjury: CreateInjuryUseCase,
    private readonly getUserInjuries: GetUserInjuriesUseCase,
    private readonly updateInjury: UpdateInjuryUseCase,
    private readonly deleteInjury: DeleteInjuryUseCase,
    private readonly logPain: LogPainUseCase,
    private readonly deleteInjuryLog: DeleteInjuryLogUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Post()
  create(@Body() body: CreateInjuryDto) {
    return this.createInjury.execute(body);
  }

  @Get(':userId')
  getAll(@Param('userId') userId: string) {
    return this.getUserInjuries.execute(userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateInjuryDto, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return this.updateInjury.execute(id, session.user.id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return this.deleteInjury.execute(id, session.user.id);
  }

  @Post(':injuryId/logs')
  addLog(@Param('injuryId') injuryId: string, @Body() body: LogPainDto) {
    return this.logPain.execute(injuryId, body);
  }

  @Delete('logs/:logId')
  @HttpCode(204)
  async removeLog(@Param('logId') logId: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return this.deleteInjuryLog.execute(logId, session.user.id);
  }
}
