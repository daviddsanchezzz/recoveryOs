import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode,
  Inject, Param, Post, Query, Req, Res,
} from '@nestjs/common';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { randomBytes } from 'crypto';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { HandleStravaCallbackUseCase } from '../application/use-cases/handle-strava-callback.use-case';
import { GetStravaStatusUseCase } from '../application/use-cases/get-strava-status.use-case';
import { SyncStravaUseCase } from '../application/use-cases/sync-strava.use-case';
import { DisconnectStravaUseCase } from '../application/use-cases/disconnect-strava.use-case';
import { HandleStravaWebhookUseCase } from '../application/use-cases/handle-strava-webhook.use-case';
import { StravaApiClient } from '../infrastructure/strava-api.client';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../domain/strava-repository.port';

class SyncBodyDto {
  @IsOptional() @IsString()
  since?: string;
}

class StravaWebhookEventDto {
  @IsString()
  aspect_type!: string;

  @IsNumber()
  event_time!: number;

  @IsNumber()
  object_id!: number;

  @IsString()
  object_type!: string;

  @IsNumber()
  owner_id!: number;

  @IsNumber()
  subscription_id!: number;

  @IsObject()
  @IsOptional()
  updates?: Record<string, unknown>;
}

@Controller('strava')
export class StravaController {
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  constructor(
    private readonly handleCallback: HandleStravaCallbackUseCase,
    private readonly getStatus: GetStravaStatusUseCase,
    private readonly syncStrava: SyncStravaUseCase,
    private readonly disconnectStrava: DisconnectStravaUseCase,
    private readonly handleWebhook: HandleStravaWebhookUseCase,
    private readonly stravaApi: StravaApiClient,
    @Inject(STRAVA_REPOSITORY) private readonly stravaRepo: StravaRepositoryPort,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  // Generate state, store in DB (avoids cookie issues through proxies), redirect to Strava
  @Get('connect')
  async connect(@Req() req: any, @Res() res: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) return res.redirect(`${this.frontendUrl}/app?strava=error&reason=auth`);

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
        return res.redirect(`${this.frontendUrl}/app?strava=error&reason=missing`);
      }

      // consumeOAuthState verifies + deletes (one-time use)
      const userId = await this.stravaRepo.consumeOAuthState(state);
      if (!userId) {
        return res.redirect(`${this.frontendUrl}/app?strava=error&reason=state`);
      }

      await this.handleCallback.execute(userId, code);
      return res.redirect(`${this.frontendUrl}/app?strava=connected`);
    } catch {
      return res.redirect(`${this.frontendUrl}/app?strava=error`);
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

  // Strava calls this GET to verify the webhook endpoint during subscription setup
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: any,
  ) {
    const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && verifyToken === expected) {
      return res.json({ 'hub.challenge': challenge });
    }
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Strava sends activity events here
  @Post('webhook')
  @HttpCode(200)
  async receiveWebhook(@Body() body: StravaWebhookEventDto) {
    // Respond 200 immediately — Strava requires response within 2 seconds
    void this.handleWebhook.execute({
      objectType: body.object_type,
      aspectType: body.aspect_type,
      objectId: body.object_id,
      ownerId: body.owner_id,
    });
    return { status: 'ok' };
  }

  // One-time admin call to register the webhook subscription with Strava
  // Protected by the verify token itself — only someone who knows the secret can call it
  @Post('webhook/subscribe')
  @HttpCode(200)
  async subscribeWebhook(@Query('token') token: string) {
    const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken || token !== verifyToken) throw new ForbiddenException();

    // Derive API base from STRAVA_REDIRECT_URI (e.g. https://api.railway.app/api/strava/callback → https://api.railway.app)
    const redirectUri = process.env.STRAVA_REDIRECT_URI ?? '';
    const apiBase = redirectUri.replace('/api/strava/callback', '');
    const callbackUrl = `${apiBase}/api/strava/webhook`;

    const result = await this.stravaApi.registerWebhookSubscription(callbackUrl, verifyToken);
    return { subscriptionId: result.id, callbackUrl };
  }
}
