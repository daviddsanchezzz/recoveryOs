import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { LoginDto } from '../application/dto/login.dto';
import { RegisterDto } from '../application/dto/register.dto';
import { GetSessionUseCase } from '../application/use-cases/get-session.use-case';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { LogoutUserUseCase } from '../application/use-cases/logout-user.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto, @Req() req: any, @Res() res: any) {
    const response = await this.registerUserUseCase.execute(body, {
      headers: this.toHeaders(req.headers),
    });
    await this.writeResponse(res, response);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: any, @Res() res: any) {
    const response = await this.loginUserUseCase.execute(body, {
      headers: this.toHeaders(req.headers),
    });
    await this.writeResponse(res, response);
  }

  @Post('logout')
  async logout(@Req() req: any, @Res() res: any) {
    const response = await this.logoutUserUseCase.execute({
      headers: this.toHeaders(req.headers),
    });
    await this.writeResponse(res, response);
  }

  @Get('session')
  session(@Req() req: any) {
    return this.getSessionUseCase.execute({
      headers: this.toHeaders(req.headers),
    });
  }

  private toHeaders(nodeHeaders: Record<string, string | string[] | undefined>) {
    const headers = new Headers();

    for (const [key, value] of Object.entries(nodeHeaders)) {
      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(key, item);
        }

        continue;
      }

      headers.set(key, value);
    }

    return headers;
  }

  private async writeResponse(res: any, response: Response) {
    const setCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : response.headers.get('set-cookie')
          ? [response.headers.get('set-cookie') as string]
          : [];

    for (const setCookie of setCookies) {
      res.append('set-cookie', setCookie);
    }

    const payloadText = await response.text();
    const contentType = response.headers.get('content-type') ?? 'application/json';

    res.status(response.status);
    res.type(contentType);

    if (!payloadText) {
      res.send();
      return;
    }

    if (contentType.includes('application/json')) {
      res.send(JSON.parse(payloadText));
      return;
    }

    res.send(payloadText);
  }
}
