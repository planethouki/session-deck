import {Link, router, usePage} from '@inertiajs/react';
import type {PropsWithChildren} from 'react';

export default function AuthenticatedLayout({children}: PropsWithChildren) {
  const {auth, flash} = usePage().props;
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800 bg-slate-900">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <Link href="/dashboard" className="font-bold text-indigo-400">Session Deck</Link>
        <Link href="/dashboard" className="text-sm text-slate-300 hover:text-white">ダッシュボード</Link>
        {auth.user?.role === 'admin' &&
          <Link href="/admin/users" className="text-sm text-slate-300 hover:text-white">ユーザー管理</Link>}
        <div className="ml-auto flex items-center gap-4 text-sm"><span>{auth.user?.name}</span>
          <button onClick={() => router.post('/logout')} className="text-slate-400 hover:text-white">ログアウト</button>
        </div>
      </nav>
    </header>
    <main className="mx-auto max-w-6xl px-6 py-10">
      {flash.success && <div
        className="mb-6 rounded-lg border border-emerald-800 bg-emerald-950 px-4 py-3 text-emerald-200">{flash.success}</div>}
      {children}
    </main>
  </div>;
}
