import { registerSchema } from '@contadim/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { applyApiError } from '../../lib/form-errors';
import { useAuth } from './auth-context';
import { AuthLayout } from './AuthLayout';

type RegisterForm = z.input<typeof registerSchema>;

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm, unknown, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      await signUp(values);
      await navigate('/', { replace: true });
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  return (
    <AuthLayout
      title="Bora organizar as contas?"
      subtitle="Crie sua conta grátis. Leva menos de um minuto."
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-semibold text-brand-700 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField
          label="Como podemos te chamar?"
          autoComplete="given-name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Pelo menos 8 caracteres."
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={isSubmitting} fullWidth>
          Criar minha conta
        </Button>
      </form>
    </AuthLayout>
  );
}
