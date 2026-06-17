import { Injectable } from '@nestjs/common';
import { AuthRequestContext, AuthServicePort, AuthSession } from '../domain/auth-service.port';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class BetterAuthService implements AuthServicePort {
  private authPromise?: Promise<any>;

  constructor(private readonly prisma: PrismaService) {
  }

  private async getAuth() {
    if (!this.authPromise) {
      this.authPromise = (async () => {
        const [{ betterAuth }, { prismaAdapter }] = await Promise.all([
          import('better-auth'),
          import('better-auth/adapters/prisma'),
        ]);

        return betterAuth({
          database: prismaAdapter(this.prisma, {
            provider: 'postgresql',
          }),
          baseURL: process.env.BETTER_AUTH_URL,
          secret: process.env.BETTER_AUTH_SECRET,
          trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
          emailAndPassword: {
            enabled: true,
          },
        });
      })();
    }

    return this.authPromise;
  }

  async register(
    input: {
      email: string;
      password: string;
      name?: string;
    },
    context: AuthRequestContext,
  ) {
    const auth = await this.getAuth();

    return auth.api.signUpEmail({
      headers: context.headers,
      body: {
        email: input.email,
        password: input.password,
        name: input.name?.trim() || input.email.split('@')[0] || 'User',
      },
      asResponse: true,
    });
  }

  async login(
    input: { email: string; password: string },
    context: AuthRequestContext,
  ) {
    const auth = await this.getAuth();

    return auth.api.signInEmail({
      headers: context.headers,
      body: {
        email: input.email,
        password: input.password,
      },
      asResponse: true,
    });
  }

  async logout(context: AuthRequestContext) {
    const auth = await this.getAuth();

    return auth.api.signOut({
      headers: context.headers,
      asResponse: true,
    });
  }

  async getSession(context: AuthRequestContext): Promise<AuthSession | null> {
    const auth = await this.getAuth();

    return auth.api.getSession({
      headers: context.headers,
    }) as Promise<AuthSession | null>;
  }
}
