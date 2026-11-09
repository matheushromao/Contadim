import { Module } from '@nestjs/common';

import { AccountsController } from './accounts.controller.js';
import { AccountsRepository } from './accounts.repository.js';
import { AccountsService } from './accounts.service.js';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, AccountsRepository],
  exports: [AccountsService, AccountsRepository],
})
export class AccountsModule {}
