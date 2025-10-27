import { FormEvent, useState } from 'react';

import { useAuth } from '../hooks/useAuth';

export default function AuthPanel({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { isAuthenticated, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      setUsername('');
      setPassword('');
      onAuthenticated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3 shadow">
        <div>
          <p className="text-sm font-semibold text-slate-100">Authenticated</p>
          <p className="text-xs text-slate-400">Your session is active.</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded bg-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-600"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg bg-slate-800 px-4 py-4 shadow">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Sign in</h2>
        <p className="text-sm text-slate-400">Use your Django credentials to access the API.</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span>Username</span>
        <input
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-brand focus:outline-none"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Password</span>
        <input
          type="password"
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-brand focus:outline-none"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center rounded bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
