/** Placeholder das telas que chegam nos próximos PRs. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-stone-600">Essa parte está sendo construída. Volta já já! 🚧</p>
    </section>
  );
}
