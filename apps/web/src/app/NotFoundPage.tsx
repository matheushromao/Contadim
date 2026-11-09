import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl">🧐</p>
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-stone-600">O endereço pode estar errado ou a página mudou de lugar.</p>
      <Link to="/" className="mt-2 font-semibold text-brand-700 hover:underline">
        Voltar para o início
      </Link>
    </main>
  );
}
