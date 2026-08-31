import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Logger, Param, Post, Query, Req, Res } from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { HandleCorosCallbackUseCase } from '../application/use-cases/handle-coros-callback.use-case';
import { GetCorosStatusUseCase } from '../application/use-cases/get-coros-status.use-case';
import { SyncCorosUseCase } from '../application/use-cases/sync-coros.use-case';
import { DisconnectCorosUseCase } from '../application/use-cases/disconnect-coros.use-case';
import { SyncCorosDto } from '../application/dto/sync-coros.dto';
import { CorosMcpClient } from '../infrastructure/coros-mcp.client';

@Controller('coros')
export class CorosController {
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  private readonly logger = new Logger(CorosController.name);

  constructor(
    private readonly mcpClient: CorosMcpClient,
    private readonly handleCallback: HandleCorosCallbackUseCase,
    private readonly getStatus: GetCorosStatusUseCase,
    private readonly syncCoros: SyncCorosUseCase,
    private readonly disconnectCoros: DisconnectCorosUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Get('connect')
  async connect(@Req() req: any, @Res() res: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) return res.redirect(`${this.frontendUrl}/app?coros=error&reason=auth`);

    try {
      const authorizationUrl = await this.mcpClient.getAuthorizationUrl(session.user.id);
      if (!authorizationUrl) return res.redirect(`${this.frontendUrl}/app?coros=connected`);
      return res.redirect(authorizationUrl);
    } catch (error) {
      this.logger.error(`COROS connect failed: ${(error as Error).message}`, (error as Error).stack);
      return res.redirect(`${this.frontendUrl}/app?coros=error&reason=mcp`);
    }
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: any) {
    try {
      if (!code || !state) return res.redirect(`${this.frontendUrl}/app?coros=error&reason=missing`);
      await this.handleCallback.execute(state, code);
      return res.redirect(`${this.frontendUrl}/app?coros=connected`);
    } catch (error) {
      this.logger.error(`COROS callback failed: ${(error as Error).message}`, (error as Error).stack);
      return res.redirect(`${this.frontendUrl}/app?coros=error`);
    }
  }

  @Get(':userId/status')
  async status(@Param('userId') userId: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();
    return this.getStatus.execute(userId);
  }

  @Post('sync')
  @HttpCode(200)
  async sync(@Req() req: any, @Body() body: SyncCorosDto) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.syncCoros.execute(session.user.id, body.date ? new Date(body.date) : undefined);
  }

  @Delete('disconnect')
  @HttpCode(204)
  async disconnect(@Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.disconnectCoros.execute(session.user.id);
  }
}
