import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestContext } from './utils/test-app.js';

describe('Infraestrutura HTTP', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /health responde ok com o banco de pé', async () => {
    const response = await request(ctx.app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('rotas inexistentes usam o formato de erro padrão', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/v1/nao-existe')
      .set('x-request-id', 'teste-123')
      .expect(404);

    expect(response.headers['x-request-id']).toBe('teste-123');
    const body = response.body as { error: Record<string, unknown> };
    expect(Object.keys(body)).toEqual(['error']);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBe('teste-123');
    expect(typeof body.error.message).toBe('string');
  });

  it('aplica cabeçalhos de segurança (Helmet)', async () => {
    const response = await request(ctx.app.getHttpServer()).get('/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('libera CORS apenas para as origens configuradas', async () => {
    const allowed = await request(ctx.app.getHttpServer())
      .options('/api/v1/qualquer')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const blocked = await request(ctx.app.getHttpServer())
      .options('/api/v1/qualquer')
      .set('Origin', 'https://site-malicioso.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});
