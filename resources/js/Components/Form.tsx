import type {InputHTMLAttributes, PropsWithChildren} from 'react';

export function Field({label, error, ...props}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string
}) {
  return <label className="block">
    <span
      className="mb-1.5 block text-sm font-medium text-slate-200">{label}</span>
    <input {...props}
           className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-indigo-500"/>{error &&
    <span className="mt-1 block text-sm text-rose-400">{error}</span>}
  </label>;
}

export function Submit({children, disabled}: PropsWithChildren<{ disabled?: boolean }>) {
  return <button
    disabled={disabled}
    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
  >
    {children}
  </button>;
}
