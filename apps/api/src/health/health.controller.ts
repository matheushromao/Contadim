import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';

import { Public } from '../common/auth/auth.decorators.js';
import { PrismaService } from '../infra/prisma/prisma.service.js';

interface HealthResponse {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  uptime: number;
}

/** Usado pelo HEALTHCHECK do Docker e por balanceadores de carga. */
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifica se a API e o banco estão de pé' })
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const uptime = Math.round(process.uptime());
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', uptime };
    } catch {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'error', database: 'down', uptime };
    }
  }
}
