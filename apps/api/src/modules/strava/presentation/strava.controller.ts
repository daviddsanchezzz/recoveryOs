import {
  Controller, Delete, ForbiddenException, Get, HttpCode,
  Inject, Param, Post, Query, Req, Res,
} from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { HandleStravaCallbackUseCase } from '../application/use-cases/handle-strava-callback.use-case';
import { GetStravaStatusUseCase } from '../application/use-cases/get-strava-status.use-case';
import { SyncStravaUseCase } from '../application/use-cases/sync-strava.use-case';
import { DisconnectStravaUseCase } from '../application/use-cases/disconnect-strava.use-case';
import { StravaApiClient } from '../infrastructure/strava-api.client';

const STATE_COOKIE = 'strava_oauth_state';

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    (header ?? '')
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k.trim(), v.join('=')]),
  );
}

function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

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

  // Generate state, store in HttpOnly cookie, redirect to Strava
  @Get('connect')
  connect(@Res() res: any) {
    const state = randomBytes(32).toString('base64url');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300_000, // 5 minutes
      path: '/',
    });
    res.redirect(this.stravaApi.getAuthUrl(state));
  }

  // Strava redirects here — verify state before processing code
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    try {
      // CSRF: verify state matches cookie (constant-time comparison)
      const cookies = parseCookies(req.headers.cookie ?? '');
      const storedState = cookies[STATE_COOKIE] ?? '';
      if (!state || !storedState || !safeEquals(state, storedState)) {
        return res.redirect(`${this.frontendUrl}/actividades?strava=error&reason=state`);
      }
      res.clearCookie(STATE_COOKIE, { path: '/' });

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
