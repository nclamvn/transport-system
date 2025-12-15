import { Controller, Get } from '@nestjs/common';
import { Public } from '@/common/decorators';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'transport-api',
      version: '1.0.0',
    };
  }

  @Public()
  @Get()
  root() {
    return {
      name: 'Transport System API',
      version: '1.0.0',
      description: 'API for Transport Management System',
      docs: '/api-docs',
      health: '/health',
    };
  }
}
