import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRootHealth() {
    return this.getHealthStatus();
  }

  @Get('health')
  health() {
    return this.getHealthStatus();
  }

  private getHealthStatus() {
    return {
      status: 'ok',
      service: 'coffee-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
