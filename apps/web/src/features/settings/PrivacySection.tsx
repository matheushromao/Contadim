import { deleteMeSchema } from '@contadim/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useToast } from '../../components/ui/toast-context';
import { applyApiError } from '../../lib/form-errors';
import { useAuth } from '../auth/auth-context';
import { useDeleteMe, useExportData } from './api';

/** Seus dados (LGPD): baixar uma cópia e excluir a conta. */
export function PrivacySection() {
  const toast = useToast();
  const exportData = useExportData();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <section
      aria-labelledby="privacy-title"
      className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"
    >
      <h2 id="privacy-title" className="font-semibold">
        Seus dados
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Os dados são seus. Você pode baixar uma cópia completa ou excluir tudo quando quiser.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {exportData.isError && <Alert>Não foi possível exportar agora. Tente novamente.</Alert>}
        <Button
          variant="secondary"
          loading={exportData.isPending}
          onClick={() =>
            exportData.mutate(undefined, {
              onSuccess: () => toast.show('Download iniciado 📦'),
            })
          }
        >
          <Download className="size-4" aria-hidden="true" />
          Baixar meus dados (JSON)
        </Button>

        {confirmingDelete ? (
          <DeleteAccountForm onCancel={() => setConfirmingDelete(false)} />
        ) : (
          <Button
            variant="ghost"
            className="text-rose-600"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir minha conta
          </Button>
        )}
      </div>
    </section>
  );
}

type DeleteForm = z.input<typeof deleteMeSchema>;

function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const { logout } = useAuth();
  const deleteMe = useDeleteMe();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DeleteForm, unknown, z.output<typeof deleteMeSchema>>({
    resolver: zodResolver(deleteMeSchema),
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError('');
    try {
      await deleteMe.mutateAsync(input);
      await logout();
    } catch (error) {
      const message = applyApiError(error, setError);
      if (message === 'Senha incorreta') setError('password', { message });
      else setFormError(message);
    }
  });

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      className="flex flex-col gap-3 rounded-xl bg-rose-50 p-4"
    >
      <p className="text-sm text-rose-900">
        <strong>Isso não tem volta.</strong> Sua conta, contas, categorias e lançamentos serão
        apagados para sempre. Se quiser, baixe seus dados antes.
      </p>
      {formError && <Alert>{formError}</Alert>}
      <TextField
        label="Digite sua senha para confirmar"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" loading={deleteMe.isPending}>
          Excluir para sempre
        </Button>
      </div>
    </form>
  );
}
