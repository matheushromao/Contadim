import type { AuthResponse } from '@contadim/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError, refreshSession, session } from './api-client';

const auth = (token: string): AuthResponse => ({
  accessToken: token,
  expiresIn: 900,
  user: { id: 'u1', name: 'Maria', email: 'maria@exemplo.com', createdAt: '2026-11-09T00:00:00Z' },
});

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const fetchMock = vi.fn<typeof fetch>();

function headersOf(call: number): Record<string, string> {
  const init = fetchMock.mock.calls[call]?.[1];
  return (init?.headers ?? {}) as Record<string, string>;
}

describe('api-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    session.set(auth('token-1'));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    session.clear();
  });

  it('envia o access token e devolve o JSON', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await expect(api('/users/me')).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/users/me');
    expect(headersOf(0).Authorization).toBe('Bearer token-1');
  });

  it('monta a query string ignorando valores vazios', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}));
    await api('/transactions', { query: { month: '2026-11', type: undefined, page: 2 } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/transactions?month=2026-11&page=2');
  });

  it('renova a sessão em caso de 401 e repete a requisição', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }))
      .mockResolvedValueOnce(json(200, auth('token-2')))
      .mockResolvedValueOnce(json(200, { ok: true }));

    await expect(api('/users/me')).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/refresh');
    expect(headersOf(1)['x-requested-with']).toBe('contadim');
    expect(headersOf(2).Authorization).toBe('Bearer token-2');
  });

  it('avisa quando a sessão foi perdida', async () => {
    const onSessionLost = vi.fn();
    const stop = session.listen({ onSession: vi.fn(), onSessionLost });
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'Entre' } }))
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }));

    await expect(api('/users/me')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(onSessionLost).toHaveBeenCalledOnce();
    stop();
  });

  it('compartilha um único refresh entre chamadas simultâneas', async () => {
    fetchMock.mockResolvedValue(json(200, auth('token-3')));
    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('converte erros no formato padrão', async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: [{ path: 'email', message: 'E-mail inválido' }],
        },
      }),
    );
    const error = await api('/auth/login', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toEqual({ email: 'E-mail inválido' });
  });

  it('trata falha de rede com mensagem amigável', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api('/users/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('retorna undefined em 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api('/accounts/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
