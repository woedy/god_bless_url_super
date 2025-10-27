import { useState } from 'react';

import type { LinkDto } from '../lib/api';

interface LinksTableProps {
  links: LinkDto[];
  loading?: boolean;
  onRefresh: () => void;
  onShowStats: (link: LinkDto) => void;
}

export default function LinksTable({ links, loading, onRefresh, onShowStats }: LinksTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (link: LinkDto) => {
    try {
      await navigator.clipboard.writeText(link.short_url);
      setCopiedCode(link.code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="rounded-lg bg-slate-800 shadow">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h3 className="text-lg font-semibold text-slate-100">My links</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-sm font-medium text-brand hover:text-sky-300"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700 text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Short URL</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Target</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Clicks</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Created</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {links.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No links yet. Generate some to see them here.'}
                </td>
              </tr>
            ) : (
              links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-brand">
                    <a href={link.short_url} target="_blank" rel="noreferrer" className="hover:underline">
                      {link.short_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className="line-clamp-2 break-all text-xs sm:text-sm">{link.target_url}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-200">{link.click_count}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(link.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(link)}
                        className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-600"
                      >
                        {copiedCode === link.code ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onShowStats(link)}
                        className="rounded border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                      >
                        Stats
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
