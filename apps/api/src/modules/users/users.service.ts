import type { User as UserDto } from '@contadim/contracts';
import { Injectable } from '@nestjs/common';

import { NotFoundError } from '../../common/errors/app-error.js';
import { toUserDto } from './users.mapper.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Conta não encontrada');
    return toUserDto(user);
  }
}
