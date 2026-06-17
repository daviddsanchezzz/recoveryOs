import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SERVICE, AuthRequestContext, AuthServicePort } from '../../domain/auth-service.port';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: AuthServicePort,
  ) {}

  execute(input: RegisterDto, context: AuthRequestContext) {
    return this.authService.register(input, context);
  }
}
