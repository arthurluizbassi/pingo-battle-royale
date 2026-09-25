/** Shown instead of the app while Supabase env vars are missing. */
export function SetupNotice() {
  return (
    <main className="game-bg min-h-screen flex items-center justify-center p-4">
      <div className="pixel-panel max-w-lg p-6">
        <h1 className="font-pixel text-2xl mb-3">Quase lá! 🔧</h1>
        <p className="mb-2">O Supabase ainda não foi configurado.</p>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            Copie <code>.env.example</code> para <code>.env.local</code> e preencha as chaves do seu projeto Supabase.
          </li>
          <li>
            Rode <code>npm run db:migrate</code> e depois <code>npm run seed</code>.
          </li>
          <li>Reinicie <code>npm run dev</code>.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">Detalhes no README.</p>
      </div>
    </main>
  );
}
