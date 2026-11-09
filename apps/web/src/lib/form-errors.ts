import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from './api-client';

/**
 * Leva os erros de validação da API para os campos do formulário e devolve a mensagem
 * geral (para exibir num alerta) quando o erro não é de um campo específico.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string {
  if (!(error instanceof ApiError)) return 'Algo deu errado. Tente novamente';

  const fields = Object.entries(error.fieldErrors);
  for (const [path, message] of fields) {
    setError(path as Path<T>, { type: 'server', message });
  }
  return fields.length > 0 ? '' : error.message;
}
