import { Global, Module } from '@nestjs/common';

import { ENV, type Env } from '../../config/env.js';
import { CLOCK, SystemClock } from './clock.js';

@Global()
@Module({
  providers: [
    { provide: CLOCK, inject: [ENV], useFactory: (env: Env) => new SystemClock(env.APP_TIMEZONE) },
  ],
  exports: [CLOCK],
})
export class ClockModule {}
