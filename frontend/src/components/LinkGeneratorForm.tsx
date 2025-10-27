import { FormEvent, useState } from 'react';

interface GeneratorFormValues {
  url: string;
  size: number;
  codeLength: number;
}

interface LinkGeneratorFormProps {
  onGenerate: (values: GeneratorFormValues) => Promise<void>;
  disabled?: boolean;
}

export default function LinkGeneratorForm({ onGenerate, disabled }: LinkGeneratorFormProps) {
  const [url, setUrl] = useState('');
  const [size, setSize] = useState(5);
  const [codeLength, setCodeLength] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onGenerate({ url, size, codeLength });
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate links');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="url-input">
          Destination URL
        </label>
        <input
          id="url-input"
          type="url"
          required
          placeholder="https://example.com/some/path"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-brand focus:outline-none"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-200" htmlFor="size-input">
          Number of links
          <input
            id="size-input"
            type="number"
            min={1}
            max={200}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-brand focus:outline-none"
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-200" htmlFor="length-input">
          Code length
          <input
            id="length-input"
            type="number"
            min={4}
            max={32}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-brand focus:outline-none"
            value={codeLength}
            onChange={(event) => setCodeLength(Number(event.target.value))}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={disabled || loading}
        className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {loading ? 'Generating…' : 'Generate links'}
      </button>
    </form>
  );
}
