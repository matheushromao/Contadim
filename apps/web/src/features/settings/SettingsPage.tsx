import { LogOut } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/States';
import { useAuth } from '../auth/auth-context';
import { PrivacySection } from './PrivacySection';

export function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title="Ajustes" />

      <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <p className="text-sm text-stone-500">Você entrou como</p>
        <p className="font-semibold">{user?.name}</p>
        <p className="text-sm text-stone-600">{user?.email}</p>
      </div>

      <nav aria-label="Cadastros" className="rounded-2xl bg-white ring-1 ring-stone-200">
        <Link to="/categorias" className="block px-4 py-3 font-medium hover:bg-stone-50">
          Categorias
        </Link>
      </nav>

      <PrivacySection />

      <Button variant="secondary" onClick={() => void logout()}>
        <LogOut className="size-4" aria-hidden="true" />
        Sair
      </Button>
    </section>
  );
}
