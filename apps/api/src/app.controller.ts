import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'recoveryos-api',
      date: new Date().toISOString(),
    };
  }
}
