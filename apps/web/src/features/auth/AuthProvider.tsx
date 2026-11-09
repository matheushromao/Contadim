import type { AuthResponse, LoginInput, RegisterInput, User } from '@contadim/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { api, refreshSession, session } from '../../lib/api-client';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const startSession = useCallback((auth: AuthResponse) => {
    session.set(auth);
    setUser(auth.user);
    setStatus('authenticated');
  }, []);

  const endSession = useCallback(() => {
    session.clear();
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    const stop = session.listen({ onSession: startSession, onSessionLost: endSession });
    // Ao abrir o app, tenta recuperar a sessão pelo cookie de refresh.
    void refreshSession().then((auth) => (auth ? startSession(auth) : endSession()));
    return stop;
  }, [startSession, endSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      startSession(
        await api<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false }),
      );
    },
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      startSession(
        await api<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false }),
      );
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', auth: false, csrf: true });
    } finally {
      endSession();
    }
  }, [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
