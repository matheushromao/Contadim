import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { ENV, type Env } from './config/env.js';
import { loadRootEnv } from './config/load-env.js';

// O env só é lido quando o módulo é instanciado, então carregar aqui é suficiente.
loadRootEnv();

const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
setupApp(app);

const env = app.get<Env>(ENV);
await app.listen(env.PORT, '0.0.0.0');
