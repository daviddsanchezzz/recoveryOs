import {
  Body, Controller, Delete, ForbiddenException,
  Get, HttpCode, Inject, Post, Req,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { AUTH_SERVICE, AuthServicePort } from '../auth/domain/auth-service.port';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString() endpoint!: string;
  @IsString() p256dh!: string;
  @IsString() auth!: string;
}

@Controller('push')
export class PushController {
  constructor(
    private readonly push: PushService,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  private async getUser(req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return session.user;
  }

  @Post('subscribe')
  @HttpCode(200)
  async subscribe(@Body() body: SubscribeDto, @Req() req: any) {
    const user = await this.getUser(req);
    await this.push.subscribe(user.id, body);
    return { ok: true };
  }

  @Delete('subscribe')
  @HttpCode(204)
  async unsubscribe(@Body() body: { endpoint: string }, @Req() req: any) {
    await this.getUser(req);
    await this.push.unsubscribe(body.endpoint);
  }

  @Get('notifications')
  async getNotifications(@Req() req: any) {
    const user = await this.getUser(req);
    return this.push.getNotifications(user.id);
  }

  @Post('notifications/mark-read')
  @HttpCode(200)
  async markRead(@Req() req: any) {
    const user = await this.getUser(req);
    await this.push.markAllRead(user.id);
    return { ok: true };
  }

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { key: process.env.VAPID_PUBLIC_KEY ?? '' };
  }
}
