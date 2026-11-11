import { Module } from '@nestjs/common';

import { CardsModule } from '../cards/cards.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { CardPurchasesController } from './card-purchases.controller.js';
import { CardPurchasesRepository } from './card-purchases.repository.js';
import { CardPurchasesService } from './card-purchases.service.js';

@Module({
  imports: [CardsModule, CategoriesModule],
  controllers: [CardPurchasesController],
  providers: [CardPurchasesService, CardPurchasesRepository],
})
export class CardPurchasesModule {}
