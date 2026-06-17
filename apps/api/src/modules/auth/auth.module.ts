import { Module } from '@nestjs/common';
import { GetSessionUseCase } from './application/use-cases/get-session.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { LogoutUserUseCase } from './application/use-cases/logout-user.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { AUTH_SERVICE } from './domain/auth-service.port';
import { BetterAuthService } from './infrastructure/better-auth.service';
import { AuthController } from './presentation/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    LogoutUserUseCase,
    GetSessionUseCase,
    BetterAuthService,
    {
      provide: AUTH_SERVICE,
      useExisting: BetterAuthService,
    },
  ],
  exports: [AUTH_SERVICE],
})
export class AuthModule {}
