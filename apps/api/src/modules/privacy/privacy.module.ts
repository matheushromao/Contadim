import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { PrivacyController } from './privacy.controller.js';
import { PrivacyRepository } from './privacy.repository.js';
import { PrivacyService } from './privacy.service.js';

/** LGPD: exportação e exclusão de dados. */
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [PrivacyController],
  providers: [PrivacyService, PrivacyRepository],
})
export class PrivacyModule {}
