import { Injectable } from '@nestjs/common';

import type { RefreshToken } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface NewRefreshToken {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  /** Cria o primeiro token de uma sessão e aproveita para limpar tokens vencidos. */
  async create(data: NewRefreshToken): Promise<RefreshToken> {
    const [, created] = await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({
        where: { userId: data.userId, expiresAt: { lt: new Date() } },
      }),
      this.prisma.refreshToken.create({ data }),
    ]);
    return created;
  }

  /**
   * Troca um token por outro da mesma família, de forma atômica.
   * Retorna `null` se o token já tiver sido usado (inclusive em corrida).
   */
  rotate(currentId: string, next: NewRefreshToken): Promise<RefreshToken | null> {
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: currentId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count === 0) return null;

      const created = await tx.refreshToken.create({ data: next });
      await tx.refreshToken.update({
        where: { id: currentId },
        data: { replacedById: created.id },
      });
      return created;
    });
  }

  /** Revoga todos os tokens ativos de uma família (encerra aquela sessão). */
  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
