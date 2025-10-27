import { useMemo, useState } from 'react';

import type { LinkDto } from '../lib/api';

interface LinksTableProps {
  links: LinkDto[];
  loading?: boolean;
  onRefresh: () => void;
  onShowStats: (link: LinkDto) => void;
}

export default function LinksTable({ links, loading, onRefresh, onShowStats }: LinksTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string>('__all__');

  const groups = useMemo(() => {
    const map = new Map<string, LinkDto[]>();
    links.forEach((link) => {
      const list = map.get(link.target_url) ?? [];
      list.push(link);
      map.set(link.target_url, list);
    });
    return Array.from(map.entries()).map(([target, items]) => {
      const sortedItems = [...items].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const mostRecent = sortedItems[0]?.created_at ?? null;
      const totalClicks = sortedItems.reduce((acc, item) => acc + item.click_count, 0);
      return { target, links: sortedItems, mostRecent, totalClicks };
    });
  }, [links]);

  const sortedGroups = useMemo(
    () =>
      [...groups].sort(
        (a, b) =>
          new Date(b.mostRecent ?? 0).getTime() -
          new Date(a.mostRecent ?? 0).getTime()
      ),
    [groups]
  );

  const availableTargets = useMemo(() => sortedGroups.map((group) => group.target), [sortedGroups]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedGroups.filter((group) => {
      if (selectedTarget !== '__all__' && group.target !== selectedTarget) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        group.target.toLowerCase().includes(query) ||
        group.links.some((link) =>
          link.short_url.toLowerCase().includes(query) || link.code.toLowerCase().includes(query)
        )
      );
    });
  }, [selectedTarget, sortedGroups, search]);

  const handleCopyLink = async (link: LinkDto) => {
    try {
      await navigator.clipboard.writeText(link.short_url);
      setCopiedCode(link.code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCopyGroup = async (target: string, linksToCopy: LinkDto[]) => {
    try {
      const payload = linksToCopy.map((item) => item.short_url).join('\n');
      await navigator.clipboard.writeText(payload);
      setCopiedGroup(target);
      setTimeout(() => setCopiedGroup(null), 2000);
    } catch (err) {
      console.error('Failed to copy group', err);
    }
  };

  const isEmpty = links.length === 0;

  return (
    <div className="rounded-lg bg-slate-800 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
        <h3 className="text-lg font-semibold text-slate-100">My links</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-sm font-medium text-brand hover:text-sky-300"
        >
          Refresh
        </button>
      </div>
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full items-center gap-2 text-xs text-slate-400 sm:max-w-xs">
            <span className="sr-only">Search links</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search short codes or targets"
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-400">
            <span className="sr-only">Filter by target URL</span>
            <select
              value={selectedTarget}
              onChange={(event) => setSelectedTarget(event.target.value)}
              className="w-full min-w-[12rem] rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none"
            >
              <option value="__all__">All targets</option>
              {availableTargets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {isEmpty ? (
        <div className="px-4 py-6 text-center text-slate-400">
          {loading ? 'Loading…' : 'No links yet. Generate some to see them here.'}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="px-4 py-6 text-center text-slate-400">No links match the current filters.</div>
      ) : (
        <div className="divide-y divide-slate-700">
          {filteredGroups.map((group) => (
            <div key={group.target} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-xl">
                  <p className="text-sm font-semibold text-slate-100 break-all">{group.target}</p>
                  <p className="text-xs text-slate-400">
                    {group.links.length} link{group.links.length === 1 ? '' : 's'} · {group.totalClicks} total
                    clicks
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyGroup(group.target, group.links)}
                  className="rounded border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                >
                  {copiedGroup === group.target ? 'Copied all!' : 'Copy all'}
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-900/60 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <a
                        href={link.short_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-semibold text-brand hover:underline"
                      >
                        {link.short_url}
                      </a>
                      <div className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
                        <span className="break-all">{link.code}</span>
                        <span className="mx-1 text-slate-600">•</span>
                        <span>{new Date(link.created_at).toLocaleString()}</span>
                        <span className="mx-1 text-slate-600">•</span>
                        <span>{link.click_count} clicks</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopyLink(link)}
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
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
