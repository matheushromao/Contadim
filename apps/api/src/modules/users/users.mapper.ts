import type { User as UserDto } from '@contadim/contracts';

import type { User } from '../../generated/prisma/client.js';

/** Converte a entidade do banco no contrato público (sem hash de senha). */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
