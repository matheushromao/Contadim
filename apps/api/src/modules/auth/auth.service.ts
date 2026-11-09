import { randomUUID } from 'node:crypto';

import type { AuthResponse, LoginInput, RegisterInput } from '@contadim/contracts';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { ConflictError, UnauthorizedError } from '../../common/errors/app-error.js';
import type { User } from '../../generated/prisma/client.js';
import { toUserDto } from '../users/users.mapper.js';
import { UsersRepository } from '../users/users.repository.js';
import { PasswordService } from './password.service.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { TokenService } from './token.service.js';

/** Resultado de um login/cadastro/refresh: o corpo da resposta + o refresh token do cookie. */
export interface Session {
  auth: AuthResponse;
  refreshToken: string;
}

const SESSION_EXPIRED = 'Sua sessão expirou. Entre novamente';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async register(input: RegisterInput): Promise<Session> {
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictError('Já existe uma conta com este e-mail');
    }
    const user = await this.users.createWithDefaults({
      name: input.name,
      email: input.email,
      passwordHash: await this.passwords.hash(input.password),
    });
    return this.startSession(user);
  }

  async login(input: LoginInput): Promise<Session> {
    const user = await this.users.findByEmail(input.email);
    const valid = user
      ? await this.passwords.verify(user.passwordHash, input.password)
      : await this.passwords.verifyDummy(input.password);
    if (!user || !valid) {
      throw new UnauthorizedError('E-mail ou senha incorretos');
    }
    return this.startSession(user);
  }

  /** Rotaciona o refresh token. Reutilizar um token antigo encerra a sessão inteira. */
  async refresh(token: string | undefined): Promise<Session> {
    if (!token) throw new UnauthorizedError(SESSION_EXPIRED);

    const stored = await this.refreshTokens.findByHash(this.tokens.hashRefreshToken(token));
    if (!stored) throw new UnauthorizedError(SESSION_EXPIRED);

    if (stored.revokedAt) {
      this.logger.warn({ userId: stored.userId }, 'Reuso de refresh token detectado');
      await this.refreshTokens.revokeFamily(stored.familyId);
      throw new UnauthorizedError(SESSION_EXPIRED);
    }
    if (stored.expiresAt <= new Date()) throw new UnauthorizedError(SESSION_EXPIRED);

    const user = await this.users.findById(stored.userId);
    if (!user) throw new UnauthorizedError(SESSION_EXPIRED);

    const next = this.tokens.generateRefreshToken();
    const rotated = await this.refreshTokens.rotate(stored.id, {
      userId: user.id,
      familyId: stored.familyId,
      tokenHash: next.tokenHash,
      expiresAt: next.expiresAt,
    });
    if (!rotated) {
      await this.refreshTokens.revokeFamily(stored.familyId);
      throw new UnauthorizedError(SESSION_EXPIRED);
    }

    return { auth: await this.buildAuthResponse(user), refreshToken: next.token };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const stored = await this.refreshTokens.findByHash(this.tokens.hashRefreshToken(token));
    if (stored) await this.refreshTokens.revokeFamily(stored.familyId);
  }

  private async startSession(user: User): Promise<Session> {
    const next = this.tokens.generateRefreshToken();
    await this.refreshTokens.create({
      userId: user.id,
      familyId: randomUUID(),
      tokenHash: next.tokenHash,
      expiresAt: next.expiresAt,
    });
    return { auth: await this.buildAuthResponse(user), refreshToken: next.token };
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const { accessToken, expiresIn } = await this.tokens.signAccessToken(user.id);
    return { accessToken, expiresIn, user: toUserDto(user) };
  }
}
