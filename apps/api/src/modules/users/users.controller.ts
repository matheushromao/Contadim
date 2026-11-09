import { type User, userSchema } from '@contadim/contracts';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type AuthUser, CurrentUser } from '../../common/auth/auth.decorators.js';
import { ApiErrorResponses, ApiZodResponse } from '../../common/openapi/zod-openapi.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Dados da pessoa autenticada' })
  @ApiZodResponse(200, userSchema)
  @ApiErrorResponses(401)
  me(@CurrentUser() user: AuthUser): Promise<User> {
    return this.users.getMe(user.id);
  }
}
