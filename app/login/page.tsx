import { redirect } from 'next/navigation';

import LoginForm from '@/app/login/login-form';
import { getSessionUser } from '@/app/lib/session';

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/');

  return (
    <main className='flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-slate-50 px-6 py-12 text-slate-900'>
      <header className='w-full max-w-sm'>
        <p className='text-sm font-bold uppercase tracking-[0.15em] text-teal-700'>
          WhatsApp Gateway
        </p>
        <h1 className='mt-2 text-3xl font-bold tracking-tight'>Entrar</h1>
        <p className='mt-2 text-slate-600'>Informe seu e-mail e senha para continuar.</p>
      </header>
      <LoginForm />
    </main>
  );
}