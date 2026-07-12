import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, usePage} from '@inertiajs/react';

export default function Dashboard() {
  const {auth} = usePage().props;
  return <AuthenticatedLayout><Head title="ダッシュボード"/><h1 className="text-3xl font-bold">ダッシュボード</h1>
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p>ようこそ、{auth.user?.name} さん。</p>
      <p className="mt-2 text-sm text-slate-400">メールアドレスの確認が完了しています。</p>
    </div>
  </AuthenticatedLayout>
}
