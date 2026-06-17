import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SERVICE, AuthRequestContext, AuthServicePort } from '../../domain/auth-service.port';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: AuthServicePort,
  ) {}

  execute(input: LoginDto, context: AuthRequestContext) {
    return this.authService.login(input, context);
  }
}
