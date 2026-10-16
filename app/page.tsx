import Link from 'next/link';

import { logout } from '@/app/lib/auth-actions';
import { verifySession } from '@/app/lib/session';
import RequestList from '@/app/request-list';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await verifySession();

  return (
    <main className='flex min-h-screen w-full flex-col gap-8 bg-slate-50 px-6 py-12 text-slate-900 sm:px-10'>
      <header className='mx-auto flex w-full max-w-7xl items-start justify-between gap-4'>
        <div>
          <p className='text-sm font-bold uppercase tracking-[0.15em] text-teal-700'>
            WhatsApp Gateway
          </p>
          <h1 className='mt-2 text-4xl font-bold tracking-tight sm:text-5xl'>
            Requisições recebidas
          </h1>
          <p className='mt-4 max-w-xl text-slate-600'>
            Acompanhe as mensagens pendentes recebidas pelo gateway e marque
            cada requisição após a leitura.
          </p>
        </div>
        <nav className='flex flex-col items-end gap-2 text-sm'>
          <span className='text-slate-600'>{user.email}</span>
          <div className='flex items-center gap-3'>
            <Link className='font-semibold text-teal-700 hover:text-teal-800' href='/alterar-senha'>
              Alterar senha
            </Link>
            <form action={logout}>
              <button
                className='border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100'
                type='submit'
              >
                Sair
              </button>
            </form>
          </div>
        </nav>
      </header>
      <RequestList />
    </main>
  );
}