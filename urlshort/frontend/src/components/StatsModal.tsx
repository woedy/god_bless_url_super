import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useMemo } from 'react';

import type { LinkStatsResponse } from '../lib/api';

interface StatsModalProps {
  open: boolean;
  stats: LinkStatsResponse | null;
  onClose: () => void;
}

type ChartPoint = { date: string; count: number };

function buildChartData(stats: LinkStatsResponse | null): ChartPoint[] {
  if (!stats) return [];
  const counts = new Map<string, number>();
  stats.recent_clicks.forEach((click) => {
    const date = new Date(click.ts).toISOString().slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  });
  const today = new Date();
  const points: ChartPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const label = day.toISOString().slice(0, 10);
    points.push({ date: label, count: counts.get(label) ?? 0 });
  }
  return points;
}

export default function StatsModal({ open, stats, onClose }: StatsModalProps) {
  const chartData = useMemo(() => buildChartData(stats), [stats]);
  const maxCount = Math.max(1, ...chartData.map((point) => point.count));

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-slate-900 p-6 text-left shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-slate-100">Link statistics</Dialog.Title>
                {stats ? (
                  <div className="mt-4 space-y-6">
                    <div>
                      <p className="text-sm text-slate-400">Short URL</p>
                      <a
                        href={stats.link.short_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-semibold text-brand hover:underline"
                      >
                        {stats.link.short_url}
                      </a>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-800 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Total clicks</p>
                        <p className="mt-2 text-3xl font-bold text-slate-100">{stats.total_clicks}</p>
                      </div>
                      <div className="rounded-lg bg-slate-800 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Recent events</p>
                        <p className="mt-2 text-3xl font-bold text-slate-100">{stats.recent_clicks.length}</p>
                      </div>
                      <div className="rounded-lg bg-slate-800 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                        <p className="mt-2 text-xl font-semibold text-slate-100">
                          {stats.link.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Last 7 days</p>
                      <svg viewBox="0 0 200 100" className="mt-3 h-32 w-full">
                        <polyline
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={chartData
                            .map((point, index) => {
                              const x = (index / Math.max(chartData.length - 1, 1)) * 200;
                              const y = 100 - (point.count / maxCount) * 90 - 5;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                        {chartData.map((point, index) => {
                          const x = (index / Math.max(chartData.length - 1, 1)) * 200;
                          const y = 100 - (point.count / maxCount) * 90 - 5;
                          return <circle key={point.date} cx={x} cy={y} r={3} fill="#38bdf8" />;
                        })}
                      </svg>
                      <div className="mt-2 grid grid-cols-7 text-center text-xs text-slate-400">
                        {chartData.map((point) => (
                          <span key={point.date}>{point.date.slice(5)}</span>
                        ))}
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded border border-slate-700">
                      <table className="min-w-full divide-y divide-slate-700 text-sm">
                        <thead className="bg-slate-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-slate-300">Timestamp</th>
                            <th className="px-4 py-2 text-left text-slate-300">IP</th>
                            <th className="px-4 py-2 text-left text-slate-300">Referrer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {stats.recent_clicks.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-4 text-center text-slate-500">
                                No click events recorded yet.
                              </td>
                            </tr>
                          ) : (
                            stats.recent_clicks.map((click) => (
                              <tr key={click.ts}>
                                <td className="px-4 py-2 text-slate-200">{new Date(click.ts).toLocaleString()}</td>
                                <td className="px-4 py-2 text-slate-400">{click.ip ?? '—'}</td>
                                <td className="px-4 py-2 text-slate-400">
                                  <span className="line-clamp-2 break-words">{click.referrer ?? '—'}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-600"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
