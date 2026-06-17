import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SERVICE, AuthRequestContext, AuthServicePort } from '../../domain/auth-service.port';

@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: AuthServicePort,
  ) {}

  execute(context: AuthRequestContext) {
    return this.authService.logout(context);
  }
}
