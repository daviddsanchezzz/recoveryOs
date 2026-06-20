import {
  Controller, Delete, ForbiddenException, Get, HttpCode,
  Inject, Param, Post, Query, Req, Res,
} from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { HandleStravaCallbackUseCase } from '../application/use-cases/handle-strava-callback.use-case';
import { GetStravaStatusUseCase } from '../application/use-cases/get-strava-status.use-case';
import { SyncStravaUseCase } from '../application/use-cases/sync-strava.use-case';
import { DisconnectStravaUseCase } from '../application/use-cases/disconnect-strava.use-case';
import { StravaApiClient } from '../infrastructure/strava-api.client';

@Controller('strava')
export class StravaController {
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  constructor(
    private readonly handleCallback: HandleStravaCallbackUseCase,
    private readonly getStatus: GetStravaStatusUseCase,
    private readonly syncStrava: SyncStravaUseCase,
    private readonly disconnectStrava: DisconnectStravaUseCase,
    private readonly stravaApi: StravaApiClient,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  // Redirect browser to Strava OAuth page
  @Get('connect')
  connect(@Res() res: any) {
    res.redirect(this.stravaApi.getAuthUrl());
  }

  // Strava redirects here after user approves
  @Get('callback')
  async callback(@Query('code') code: string, @Req() req: any, @Res() res: any) {
    try {
      const session = await this.authService.getSession({ headers: new Headers(req.headers) });
      if (!session) {
        return res.redirect(`${this.frontendUrl}/actividades?strava=error&reason=auth`);
      }
      await this.handleCallback.execute(session.user.id, code);
      return res.redirect(`${this.frontendUrl}/actividades?strava=connected`);
    } catch {
      return res.redirect(`${this.frontendUrl}/actividades?strava=error`);
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
  async sync(@Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.syncStrava.execute(session.user.id);
  }

  @Delete('disconnect')
  @HttpCode(204)
  async disconnect(@Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.disconnectStrava.execute(session.user.id);
  }
}
