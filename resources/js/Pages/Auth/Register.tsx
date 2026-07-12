import {Field, Submit} from '@/Components/Form';
import GuestLayout from '@/Layouts/GuestLayout';
import {Head, Link, useForm} from '@inertiajs/react';

export default function Register() {
  const form = useForm({name: '', email: '', password: '', password_confirmation: ''});
  return <GuestLayout>
    <Head title="新規登録"/>
    <h1 className="mb-6 text-2xl font-bold">新規登録</h1>
    <form onSubmit={e => {
      e.preventDefault();
      form.post('/register');
    }} className="space-y-5">
      <Field label="名前" value={form.data.name} onChange={e => form.setData('name', e.target.value)}
             error={form.errors.name}/>
      <Field label="メールアドレス" type="email" value={form.data.email}
             onChange={e => form.setData('email', e.target.value)} error={form.errors.email}/>
      <Field label="パスワード（8文字以上）" type="password" value={form.data.password}
             onChange={e => form.setData('password', e.target.value)} error={form.errors.password}/>
      <Field label="パスワード（確認）" type="password" value={form.data.password_confirmation}
             onChange={e => form.setData('password_confirmation', e.target.value)}/>
      <Submit disabled={form.processing}>登録する</Submit>
    </form>
    <Link href="/login" className="mt-6 block text-center text-sm text-indigo-400">ログインへ戻る</Link>
  </GuestLayout>;
}
