import { randomUUID } from 'node:crypto';

import { type ExecutionContext, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AUTH_RATE_LIMIT_KEY } from './common/auth/auth.decorators.js';
import { ClockModule } from './common/clock/clock.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ENV, type Env } from './config/env.js';
import { EnvModule } from './config/env.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CardPurchasesModule } from './modules/card-purchases/card-purchases.module.js';
import { CardsModule } from './modules/cards/cards.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { InvoicesModule } from './modules/invoices/invoices.module.js';
import { PrivacyModule } from './modules/privacy/privacy.module.js';
import { SummaryModule } from './modules/summary/summary.module.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    EnvModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          genReqId: (request, response) => {
            const incoming = request.headers['x-request-id'];
            const id =
              typeof incoming === 'string' && incoming.length <= 128 ? incoming : randomUUID();
            response.setHeader('x-request-id', id);
            return id;
          },
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          autoLogging: { ignore: (request) => request.url === '/health' },
          ...(env.NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
            : {}),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ENV, Reflector],
      useFactory: (env: Env, reflector: Reflector) => [
        {
          ttl: env.RATE_LIMIT_TTL_SECONDS * 1000,
          // Rotas marcadas com @AuthRateLimit() (login, cadastro) têm limite mais baixo.
          limit: (context: ExecutionContext) =>
            reflector.getAllAndOverride<boolean>(AUTH_RATE_LIMIT_KEY, [
              context.getHandler(),
              context.getClass(),
            ])
              ? env.AUTH_RATE_LIMIT_MAX
              : env.RATE_LIMIT_MAX,
        },
      ],
    }),
    PrismaModule,
    ClockModule,
    UsersModule,
    AuthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    SummaryModule,
    PrivacyModule,
    CardsModule,
    CardPurchasesModule,
    InvoicesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
