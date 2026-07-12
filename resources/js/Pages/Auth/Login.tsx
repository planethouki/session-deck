import {Field, Submit} from '@/Components/Form';
import GuestLayout from '@/Layouts/GuestLayout';
import {Head, Link, useForm, usePage} from '@inertiajs/react';

export default function Login() {
  const {flash} = usePage().props;
  const form = useForm({email: '', password: '', remember: false});
  return <GuestLayout>
    <Head title="ログイン"/>
    <h1 className="mb-6 text-2xl font-bold">ログイン</h1>
    {flash.status && <p className="mb-4 text-sm text-emerald-300">{flash.status}</p>}
    <form onSubmit={e => {
      e.preventDefault();
      form.post('/login');
    }} className="space-y-5">
      <Field label="メールアドレス" type="email" autoComplete="email" value={form.data.email}
             onChange={e => form.setData('email', e.target.value)} error={form.errors.email}/>
      <Field label="パスワード" type="password" autoComplete="current-password" value={form.data.password}
             onChange={e => form.setData('password', e.target.value)} error={form.errors.password}/>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.data.remember}
                                                                onChange={e => form.setData('remember', e.target.checked)}/>ログイン状態を保持</label>
      <Submit disabled={form.processing}>ログイン</Submit>
    </form>
    <div className="mt-6 flex justify-between text-sm text-indigo-400"><Link href="/register">新規登録</Link><Link
      href="/forgot-password">パスワードを忘れた</Link>
    </div>
  </GuestLayout>;
}
