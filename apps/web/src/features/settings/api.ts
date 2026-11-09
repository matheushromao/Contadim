import type { DeleteMeInput, UserDataExport } from '@contadim/contracts';
import { useMutation } from '@tanstack/react-query';

import { api } from '../../lib/api-client';
import { downloadJson } from '../../lib/download';

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const data = await api<UserDataExport>('/users/me/export');
      downloadJson(`contadim-dados-${data.exportedAt.slice(0, 10)}.json`, data);
    },
  });
}

export function useDeleteMe() {
  return useMutation({
    mutationFn: (input: DeleteMeInput) => api<void>('/users/me', { method: 'DELETE', body: input }),
  });
}
