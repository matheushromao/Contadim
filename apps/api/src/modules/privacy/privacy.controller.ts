import {
  type DeleteMeInput,
  deleteMeSchema,
  type UserDataExport,
  userDataExportSchema,
} from '@contadim/contracts';
import { Controller, Delete, Get, Header, HttpCode, HttpStatus, Inject, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthRateLimit, type AuthUser, CurrentUser } from '../../common/auth/auth.decorators.js';
import { ApiErrorResponses, ApiZodBody, ApiZodResponse } from '../../common/openapi/zod-openapi.js';
import { ZodBody } from '../../common/pipes/params.js';
import { ENV, type Env } from '../../config/env.js';
import { clearRefreshCookie } from '../auth/refresh-cookie.js';
import { PrivacyService } from './privacy.service.js';

@ApiTags('users')
@ApiBearerAuth()
@ApiErrorResponses(401)
@Controller('users/me')
export class PrivacyController {
  constructor(
    private readonly privacy: PrivacyService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get('export')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Exporta todos os seus dados em JSON (LGPD)' })
  @ApiZodResponse(200, userDataExportSchema)
  async export(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserDataExport> {
    const data = await this.privacy.exportData(user.id);
    const date = data.exportedAt.slice(0, 10);
    response.setHeader('Content-Disposition', `attachment; filename="contadim-dados-${date}.json"`);
    return data;
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthRateLimit()
  @ApiOperation({ summary: 'Exclui sua conta e todos os seus dados, de forma definitiva (LGPD)' })
  @ApiZodBody(deleteMeSchema)
  @ApiErrorResponses(400, 403, 429)
  async delete(
    @CurrentUser() user: AuthUser,
    @ZodBody(deleteMeSchema) body: DeleteMeInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.privacy.deleteAccount(user.id, body.password);
    clearRefreshCookie(response, this.env);
  }
}
