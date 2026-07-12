import {Field, Submit} from '@/Components/Form';
import GuestLayout from '@/Layouts/GuestLayout';
import {Head, Link, useForm, usePage} from '@inertiajs/react';

export default function ForgotPassword() {
  const {flash} = usePage().props;
  const f = useForm({email: ''});
  return <GuestLayout>
    <Head title="パスワード再設定"/>
    <h1 className="mb-3 text-2xl font-bold">パスワード再設定</h1>
    <p className="mb-6 text-sm text-slate-300">再設定用リンクをメールで送信します。</p>
    {flash.status && <p className="mb-4 text-sm text-emerald-300">{flash.status}</p>}
    <form onSubmit={e => {
      e.preventDefault();
      f.post('/forgot-password')
    }} className="space-y-5">
      <Field label="メールアドレス" type="email" value={f.data.email}
             onChange={e => f.setData('email', e.target.value)}
             error={f.errors.email}/>
      <Submit disabled={f.processing}>送信する</Submit>
    </form>
    <Link href="/login"
          className="mt-6 block text-center text-sm text-indigo-400">ログインへ戻る</Link>
  </GuestLayout>
}
