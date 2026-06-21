import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode,
  Inject, Param, Post, Query, Req, Res,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { randomBytes } from 'crypto';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';

class SyncBodyDto {
  @IsOptional() @IsString()
  since?: string;
}
import { HandleStravaCallbackUseCase } from '../application/use-cases/handle-strava-callback.use-case';
import { GetStravaStatusUseCase } from '../application/use-cases/get-strava-status.use-case';
import { SyncStravaUseCase } from '../application/use-cases/sync-strava.use-case';
import { DisconnectStravaUseCase } from '../application/use-cases/disconnect-strava.use-case';
import { StravaApiClient } from '../infrastructure/strava-api.client';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../domain/strava-repository.port';

@Controller('strava')
export class StravaController {
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  constructor(
    private readonly handleCallback: HandleStravaCallbackUseCase,
    private readonly getStatus: GetStravaStatusUseCase,
    private readonly syncStrava: SyncStravaUseCase,
    private readonly disconnectStrava: DisconnectStravaUseCase,
    private readonly stravaApi: StravaApiClient,
    @Inject(STRAVA_REPOSITORY) private readonly stravaRepo: StravaRepositoryPort,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  // Generate state, store in DB (avoids cookie issues through proxies), redirect to Strava
  @Get('connect')
  async connect(@Req() req: any, @Res() res: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) return res.redirect(`${this.frontendUrl}/actividades?strava=error&reason=auth`);

    const state = randomBytes(32).toString('base64url');
    await this.stravaRepo.createOAuthState(state, session.user.id);
    res.redirect(this.stravaApi.getAuthUrl(state));
  }

  // Strava redirects here — look up state from DB, no cookie needed
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    try {
      if (!state || !code) {
        return res.redirect(`${this.frontendUrl}/actividades?strava=error&reason=missing`);
      }

      // consumeOAuthState verifies + deletes (one-time use)
      const userId = await this.stravaRepo.consumeOAuthState(state);
      if (!userId) {
        return res.redirect(`${this.frontendUrl}/actividades?strava=error&reason=state`);
      }

      await this.handleCallback.execute(userId, code);
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
  async sync(@Req() req: any, @Body() body: SyncBodyDto) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.syncStrava.execute(session.user.id, body.since);
  }

  @Delete('disconnect')
  @HttpCode(204)
  async disconnect(@Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.disconnectStrava.execute(session.user.id);
  }
}
