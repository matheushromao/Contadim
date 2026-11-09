import { loginSchema } from '@contadim/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import type { z } from 'zod';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { applyApiError } from '../../lib/form-errors';
import { useAuth } from './auth-context';
import { AuthLayout } from './AuthLayout';

type LoginForm = z.input<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      await navigate(from ?? '/', { replace: true });
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  return (
    <AuthLayout
      title="Que bom te ver de novo!"
      subtitle="Entre para ver como estão suas contas."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-brand-700 hover:underline">
            Crie grátis
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={isSubmitting} fullWidth>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
