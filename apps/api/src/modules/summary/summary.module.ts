import { Module } from '@nestjs/common';

import { SummaryController } from './summary.controller.js';
import { SummaryRepository } from './summary.repository.js';
import { SummaryService } from './summary.service.js';

@Module({
  controllers: [SummaryController],
  providers: [SummaryService, SummaryRepository],
})
export class SummaryModule {}
