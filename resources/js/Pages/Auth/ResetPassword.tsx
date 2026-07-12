import {Field, Submit} from '@/Components/Form';
import GuestLayout from '@/Layouts/GuestLayout';
import {Head, useForm} from '@inertiajs/react';

export default function ResetPassword({token, email}: { token: string; email: string }) {
  const f = useForm({token, email, password: '', password_confirmation: ''});
  return <GuestLayout>
    <Head title="新しいパスワード"/>
    <h1 className="mb-6 text-2xl font-bold">新しいパスワード</h1>
    <form onSubmit={e => {
      e.preventDefault();
      f.post('/reset-password')
    }} className="space-y-5">
      <Field label="メールアドレス" type="email" value={f.data.email}
             onChange={e => f.setData('email', e.target.value)}
             error={f.errors.email}/>
      <Field label="新しいパスワード" type="password"
             value={f.data.password}
             onChange={e => f.setData('password', e.target.value)}
             error={f.errors.password}/>
      <Field
        label="パスワード（確認）" type="password" value={f.data.password_confirmation}
        onChange={e => f.setData('password_confirmation', e.target.value)}/>
      <Submit disabled={f.processing}>更新する</Submit></form>
  </GuestLayout>
}
