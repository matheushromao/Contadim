import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module.js';
import { CardsModule } from '../cards/cards.module.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesRepository } from './invoices.repository.js';
import { InvoicesService } from './invoices.service.js';

@Module({
  imports: [CardsModule, AccountsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository],
})
export class InvoicesModule {}
