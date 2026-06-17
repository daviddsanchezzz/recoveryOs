import { UserEntity } from './user.entity';

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

export type AuthRequestContext = {
  headers: Headers;
};

export type AuthSession = {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
  };
};

export interface AuthServicePort {
  register(
    input: {
      email: string;
      password: string;
      name?: string;
    },
    context: AuthRequestContext,
  ): Promise<Response>;
  login(
    input: { email: string; password: string },
    context: AuthRequestContext,
  ): Promise<Response>;
  logout(context: AuthRequestContext): Promise<Response>;
  getSession(context: AuthRequestContext): Promise<AuthSession | null>;
}
