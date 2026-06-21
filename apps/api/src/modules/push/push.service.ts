import { Injectable, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PushService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const publicKey  = process.env.VAPID_PUBLIC_KEY ?? '';
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
    const email      = process.env.VAPID_EMAIL ?? 'mailto:admin@recoveryos.app';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(email, publicKey, privateKey);
    }
  }

  async subscribe(userId: string, data: { endpoint: string; p256dh: string; auth: string }) {
    await this.prisma.pushSubscription.upsert({
      where:  { endpoint: data.endpoint },
      create: { userId, ...data },
      update: { userId },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async sendToUser(userId: string, payload: { title: string; body: string; type: string }) {
    // Persist in-app notification
    await this.prisma.notification.create({
      data: { userId, title: payload.title, body: payload.body, type: payload.type },
    });

    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: payload.title, body: payload.body }),
          )
          .catch(async (err: any) => {
            if (err?.statusCode === 410) {
              // Subscription expired — clean up
              await this.prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
            }
          }),
      ),
    );
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where:  { userId, read: false },
      data:   { read: true },
    });
  }
}
