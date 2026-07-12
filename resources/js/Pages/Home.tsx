import {Head, Link, usePage} from '@inertiajs/react';

type HomeProps = {
  appName: string;
  framework: string;
};

export default function Home({appName, framework}: HomeProps) {
  const {auth} = usePage().props;
  return (
    <>
      <Head title="Home"/>
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
        <section className="max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-400">
            {appName}
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            React + TypeScript + Inertia.js
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            {framework} と React を、ひとつのリポジトリで開発できる構成になりました。
          </p>
          <div className="mt-8 flex justify-center gap-3">{auth.user ? <Link href="/dashboard"
                                                                             className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold">ダッシュボード</Link> : <>
            <Link href="/login"
                  className="rounded-lg border border-slate-700 px-5 py-3 font-semibold">ログイン</Link><Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold">新規登録</Link></>}</div>
        </section>
      </main>
    </>
  );
}
