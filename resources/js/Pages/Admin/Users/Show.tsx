import {Submit} from '@/Components/Form';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, useForm} from '@inertiajs/react';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string
};

export default function Show({managedUser: u}: { managedUser: User }) {
  const f = useForm({role: u.role, is_active: u.is_active});
  return <AuthenticatedLayout>
    <Head title={u.name}/>
    <Link href="/admin/users" className="text-sm text-indigo-400">← ユーザー一覧</Link>
    <h1 className="mt-4 text-3xl font-bold">{u.name}</h1>
    <p className="mt-1 text-slate-400">{u.email}</p>
    <form onSubmit={e => {
      e.preventDefault();
      f.patch(`/admin/users/${u.id}`)
    }} className="mt-8 max-w-lg space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <label className="block"><span className="mb-2 block text-sm">ロール</span>
        <select value={f.data.role}
                onChange={e => f.setData('role', e.target.value as 'user' | 'admin')}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
        >
          <option value="user">一般ユーザー</option>
          <option value="admin">管理者</option>
        </select>
      </label>
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={f.data.is_active}
               onChange={e => f.setData('is_active', e.target.checked)}/
        >アカウントを有効にする</label>
      {f.errors.role && <p className="text-sm text-rose-400">{f.errors.role}</p>}
      <Submit disabled={f.processing}>更新する</Submit>
    </form>
  </AuthenticatedLayout>
}
