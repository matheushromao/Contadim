import { Module } from '@nestjs/common';

import { CardsController } from './cards.controller.js';
import { CardsRepository } from './cards.repository.js';
import { CardsService } from './cards.service.js';

@Module({
  controllers: [CardsController],
  providers: [CardsService, CardsRepository],
  exports: [CardsService, CardsRepository],
})
export class CardsModule {}
