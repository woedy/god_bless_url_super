import { useCallback, useEffect, useMemo, useState } from 'react';

import AuthPanel from './components/AuthPanel';
import LinkGeneratorForm from './components/LinkGeneratorForm';
import LinksTable from './components/LinksTable';
import StatsModal from './components/StatsModal';
import { useAuth } from './hooks/useAuth';
import type { LinkDto, LinkStatsResponse } from './lib/api';
import { bulkCreateLinks, deleteLink, fetchLinks, fetchStats } from './lib/api';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export default function App() {
  const { token, isAuthenticated } = useAuth();
  const [links, setLinks] = useState<LinkDto[]>([]);
  const [generated, setGenerated] = useState<LinkDto[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [stats, setStats] = useState<LinkStatsResponse | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadLinks = useCallback(async () => {
    if (!token) return;
    setLoadingLinks(true);
    try {
      const response = await fetchLinks(token);
      setLinks(response);
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load links' });
    } finally {
      setLoadingLinks(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadLinks();
    } else {
      setLinks([]);
      setGenerated([]);
    }
  }, [isAuthenticated, loadLinks]);

  const handleGenerate = useCallback(
    async ({ url, size, codeLength }: { url: string; size: number; codeLength: number }) => {
      if (!token) {
        throw new Error('Please sign in before generating links.');
      }
      const response = await bulkCreateLinks(token, {
        url,
        size,
        code_length: codeLength
      });
      setGenerated(response.links);
      setLinks((prev) => [...response.links, ...prev]);
      showToast({
        type: 'success',
        message: response.message ?? `Created ${response.links.length} new links.`
      });
    },
    [token, showToast]
  );

  const handleShowStats = useCallback(
    async (link: LinkDto) => {
      if (!token) {
        showToast({ type: 'error', message: 'Sign in to view statistics.' });
        return;
      }
      try {
        const response = await fetchStats(token, link.code);
        setStats(response);
        setStatsOpen(true);
      } catch (err) {
        showToast({ type: 'error', message: err instanceof Error ? err.message : 'Unable to load stats' });
      }
    },
    [token, showToast]
  );

  const handleDeleteLink = useCallback(
    async (link: LinkDto) => {
      if (!token) {
        showToast({ type: 'error', message: 'Sign in to delete links.' });
        return;
      }

      const confirmed = window.confirm(
        `Delete ${link.short_url}? This action cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      try {
        await deleteLink(token, link.code);
        setLinks((prev) => prev.filter((item) => item.id !== link.id));
        setGenerated((prev) => prev.filter((item) => item.id !== link.id));
        showToast({ type: 'success', message: 'Link deleted.' });
      } catch (err) {
        showToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Unable to delete the link.'
        });
      }
    },
    [token, showToast]
  );

  const generatedList = useMemo(() => generated, [generated]);
  const generatedTarget = generatedList.length > 0 ? generatedList[0].target_url : null;

  const handleCopyGeneratedBatch = useCallback(async () => {
    if (generatedList.length === 0) {
      return;
    }
    try {
      const payload = generatedList.map((link) => link.short_url).join('\n');
      await navigator.clipboard.writeText(payload);
      showToast({ type: 'success', message: 'Copied all short URLs for the latest batch.' });
    } catch (err) {
      console.error('Failed to copy batch', err);
      showToast({ type: 'error', message: 'Unable to copy the batch to your clipboard.' });
    }
  }, [generatedList, showToast]);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-slate-100">God Bless URL Super</h1>
            <p className="text-sm text-slate-400">Bulk-generate short links with built-in analytics.</p>
          </div>
          <AuthPanel onAuthenticated={() => loadLinks()} />
          {toast ? (
            <div
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
              }`}
            >
              {toast.message}
            </div>
          ) : null}
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-xl bg-slate-900 p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-100">Bulk generator</h2>
              <p className="text-sm text-slate-400">
                Provide a destination URL and generate up to 200 unique short links at once.
              </p>
            </div>
            <LinkGeneratorForm onGenerate={handleGenerate} disabled={!isAuthenticated} />
            {!isAuthenticated ? (
              <p className="mt-4 text-sm text-amber-300">
                Sign in first to generate links. Create a user via the Django admin or the management command.
              </p>
            ) : null}
            {generatedList.length > 0 ? (
              <div className="mt-6 space-y-3">
                <h3 className="text-lg font-semibold text-slate-200">Latest batch</h3>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  {generatedTarget ? <span className="break-all">Target: {generatedTarget}</span> : null}
                  <button
                    type="button"
                    onClick={() => void handleCopyGeneratedBatch()}
                    className="rounded border border-brand px-3 py-1 font-semibold text-brand hover:bg-brand/10"
                  >
                    Copy all
                  </button>
                </div>
                <ul className="space-y-2">
                  {generatedList.map((link) => (
                    <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800 px-3 py-2">
                      <div className="flex flex-col">
                        <a href={link.short_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand">
                          {link.short_url}
                        </a>
                        <span className="text-xs text-slate-400">{link.target_url}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(link.short_url)}
                        className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-600"
                      >
                        Copy
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-4">
            <LinksTable
              links={links}
              loading={loadingLinks}
              onRefresh={loadLinks}
              onShowStats={handleShowStats}
              onDelete={handleDeleteLink}
            />
            <div className="rounded-xl bg-slate-900 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-100">Tips</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>Use the bulk generator to pre-provision campaign links with unique tracking.</li>
                <li>Click a short URL to test the redirect. Stats update instantly after a refresh.</li>
                <li>Bring your own domain and point subdomains to the backend for redirects and API calls.</li>
              </ul>
            </div>
          </section>
        </main>
      </div>
      <StatsModal open={statsOpen} stats={stats} onClose={() => { setStatsOpen(false); setStats(null); }} />
    </div>
  );
}
