import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ENV, type Env } from '../../config/env.js';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async signAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    const accessToken = await this.jwt.signAsync({ sub: userId });
    return { accessToken, expiresIn: this.env.JWT_ACCESS_TTL_SECONDS };
  }

  /** Gera um refresh token opaco. Apenas o hash é persistido. */
  generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    return { token, tokenHash: this.hashRefreshToken(token), expiresAt };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
