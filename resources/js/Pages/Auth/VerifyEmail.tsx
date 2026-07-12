import {Field, Submit} from '@/Components/Form';
import GuestLayout from '@/Layouts/GuestLayout';
import {Head, router, useForm, usePage} from '@inertiajs/react';

export default function VerifyEmail() {
  const {flash} = usePage().props;
  const form = useForm({code: ''});
  return <GuestLayout><Head title="メール確認"/><h1 className="text-2xl font-bold">メールを確認してください</h1><p
    className="mt-3 text-sm leading-6 text-slate-300">メール内のボタンを押すか、6桁の確認コードを入力してください。コードは10分間有効です。</p>
    {flash.status === 'verification-link-sent' &&
      <p className="mt-4 text-sm text-emerald-300">確認メールを再送しました。</p>}
    <form onSubmit={e => {
      e.preventDefault();
      form.post('/verify-email/code');
    }} className="mt-6 space-y-4"><Field label="確認コード" inputMode="numeric" maxLength={6} value={form.data.code}
                                         onChange={e => form.setData('code', e.target.value.replace(/\D/g, ''))}
                                         error={form.errors.code}/><Submit disabled={form.processing}>確認する</Submit>
    </form>
    <div className="mt-6 flex justify-between">
      <button onClick={() => router.post('/email/verification-notification')}
              className="text-sm text-indigo-400">確認メールを再送
      </button>
      <button onClick={() => router.post('/logout')} className="text-sm text-slate-400">ログアウト</button>
    </div>
  </GuestLayout>;
}
