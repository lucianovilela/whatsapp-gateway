import { prisma } from "@/app/lib/prisma";
import RequestList from "@/app/request-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requests = await prisma.request.findMany({ orderBy: { id: "desc" } });

  return (
    <main className="flex min-h-screen w-full flex-col gap-8 bg-slate-50 px-6 py-12 text-slate-900 sm:px-10">
      <header className="mx-auto flex w-full max-w-4xl items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-teal-700">
            WhatsApp Gateway
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Requisições recebidas
          </h1>
          <p className="mt-4 max-w-xl text-slate-600">
            Acompanhe o conteúdo recebido e marque cada requisição após a
            leitura.
          </p>
        </div>
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-xl font-bold text-teal-700"
          aria-label={`${requests.length} requisições`}
        >
          {requests.length}
        </span>
      </header>
      <RequestList initialRequests={requests} />
    </main>
  );
}
