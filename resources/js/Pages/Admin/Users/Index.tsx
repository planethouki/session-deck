import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, router} from '@inertiajs/react';
import {useState} from 'react';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_active: boolean;
  email_verified_at: string | null
};
type Props = {
  users: {
    data: User[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number
  };
  filters: { search: string }
};

export default function Index({users, filters}: Props) {
  const [search, setSearch] = useState(filters.search);
  return <AuthenticatedLayout><Head title="ユーザー管理"/>
    <div className="flex items-end justify-between">
      <div><p className="text-sm font-semibold text-indigo-400">管理者ページ</p><h1
        className="text-3xl font-bold">ユーザー管理</h1></div>
      <span className="text-sm text-slate-400">{users.total}件</span></div>
    <form className="mt-6 flex gap-2" onSubmit={e => {
      e.preventDefault();
      router.get('/admin/users', {search}, {preserveState: true})
    }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・メールアドレスで検索"
              className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"/>
      <button className="rounded-lg bg-indigo-600 px-5 py-2">検索</button>
    </form>
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-slate-400">
        <tr>
          <th className="px-4 py-3">ユーザー</th>
          <th className="px-4 py-3">ロール</th>
          <th className="px-4 py-3">メール確認</th>
          <th className="px-4 py-3">状態</th>
        </tr>
        </thead>
        <tbody>{users.data.map(u => <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-900/60">
          <td className="px-4 py-3"><Link href={`/admin/users/${u.id}`}
                                          className="font-medium text-indigo-300">{u.name}</Link>
            <div className="text-slate-400">{u.email}</div>
          </td>
          <td className="px-4 py-3">{u.role === 'admin' ? '管理者' : '一般'}</td>
          <td className="px-4 py-3">{u.email_verified_at ? '確認済み' : '未確認'}</td>
          <td className="px-4 py-3">{u.is_active ? '有効' : '停止'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="mt-6 flex flex-wrap gap-2">
      {users.links.map((l, i) => <button key={i} disabled={!l.url}
                                         onClick={() => l.url && router.get(l.url)}
                                         dangerouslySetInnerHTML={{__html: l.label}}
                                         className={`rounded border px-3 py-1 text-sm ${l.active ? 'border-indigo-500 bg-indigo-950' : 'border-slate-700'} disabled:opacity-40`}/>)}
    </div>
  </AuthenticatedLayout>
}
