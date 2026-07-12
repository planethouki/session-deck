import {Link} from '@inertiajs/react';
import type {PropsWithChildren} from 'react';

export default function GuestLayout({children}: PropsWithChildren) {
  return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-12 text-slate-100">
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 block text-center text-xl font-bold text-indigo-400">Session Deck</Link>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">{children}</section>
    </div>
  </main>;
}
