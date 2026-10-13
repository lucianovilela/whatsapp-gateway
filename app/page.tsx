import RequestList from '@/app/request-list';

export const dynamic = 'force-dynamic';

export default function Home() {
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
      </header>
      <RequestList />
    </main>
  );
}
