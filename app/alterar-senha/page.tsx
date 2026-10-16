import Link from 'next/link';

import ChangePasswordForm from '@/app/alterar-senha/change-password-form';
import { verifySession } from '@/app/lib/session';

export default async function ChangePasswordPage() {
  const user = await verifySession();

  return (
    <main className='flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-slate-50 px-6 py-12 text-slate-900'>
      <header className='w-full max-w-sm'>
        <Link className='text-sm font-semibold text-teal-700 hover:text-teal-800' href='/'>
          &larr; Voltar
        </Link>
        <h1 className='mt-4 text-3xl font-bold tracking-tight'>Alterar senha</h1>
        <p className='mt-2 text-slate-600'>{user.email}</p>
      </header>
      <ChangePasswordForm />
    </main>
  );
}