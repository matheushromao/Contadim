import {
  type AuthResponse,
  authResponseSchema,
  type LoginInput,
  loginSchema,
  type RegisterInput,
  registerSchema,
} from '@contadim/contracts';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthRateLimit, Public } from '../../common/auth/auth.decorators.js';
import { CsrfHeaderGuard } from '../../common/auth/csrf-header.guard.js';
import { ApiErrorResponses, ApiZodBody, ApiZodResponse } from '../../common/openapi/zod-openapi.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ENV, type Env } from '../../config/env.js';
import { AuthService, type Session } from './auth.service.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './refresh-cookie.js';

const CsrfHeaderDoc = () =>
  ApiHeader({ name: 'X-Requested-With', required: true, description: 'Deve ser "contadim"' });

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @AuthRateLimit()
  @ApiOperation({ summary: 'Cria uma conta (com categorias padrão e a conta "Carteira")' })
  @ApiZodBody(registerSchema)
  @ApiZodResponse(201, authResponseSchema)
  @ApiErrorResponses(400, 409, 429)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.respond(response, await this.auth.register(body));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit()
  @ApiOperation({ summary: 'Entra com e-mail e senha' })
  @ApiZodBody(loginSchema)
  @ApiZodResponse(200, authResponseSchema)
  @ApiErrorResponses(400, 401, 429)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.respond(response, await this.auth.login(body));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfHeaderGuard)
  @CsrfHeaderDoc()
  @ApiOperation({ summary: 'Gera um novo access token a partir do cookie de refresh' })
  @ApiZodResponse(200, authResponseSchema)
  @ApiErrorResponses(401, 403)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    try {
      return this.respond(response, await this.auth.refresh(readRefreshCookie(request)));
    } catch (error) {
      clearRefreshCookie(response, this.env);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CsrfHeaderGuard)
  @CsrfHeaderDoc()
  @ApiOperation({ summary: 'Encerra a sessão atual' })
  @ApiErrorResponses(403)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(readRefreshCookie(request));
    clearRefreshCookie(response, this.env);
  }

  private respond(response: Response, session: Session): AuthResponse {
    setRefreshCookie(response, session.refreshToken, this.env);
    return session.auth;
  }
}
