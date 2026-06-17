import { Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { AuthRequestContext, AuthServicePort, AuthSession } from '../domain/auth-service.port';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class BetterAuthService implements AuthServicePort {
  private readonly auth;

  constructor(private readonly prisma: PrismaService) {
    this.auth = betterAuth({
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
  }

  register(
    input: {
      email: string;
      password: string;
      name?: string;
    },
    context: AuthRequestContext,
  ) {
    return this.auth.api.signUpEmail({
      headers: context.headers,
      body: {
        email: input.email,
        password: input.password,
        name: input.name?.trim() || input.email.split('@')[0] || 'User',
      },
      asResponse: true,
    });
  }

  login(
    input: { email: string; password: string },
    context: AuthRequestContext,
  ) {
    return this.auth.api.signInEmail({
      headers: context.headers,
      body: {
        email: input.email,
        password: input.password,
      },
      asResponse: true,
    });
  }

  logout(context: AuthRequestContext) {
    return this.auth.api.signOut({
      headers: context.headers,
      asResponse: true,
    });
  }

  getSession(context: AuthRequestContext): Promise<AuthSession | null> {
    return this.auth.api.getSession({
      headers: context.headers,
    }) as Promise<AuthSession | null>;
  }
}
