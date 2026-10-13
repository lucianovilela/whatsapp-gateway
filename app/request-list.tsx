'use client';

import { useEffect, useState } from 'react';

type GatewayRequest = {
  id: number;
  texto: string;
  dataInclusao: string;
};

type MessageDetails = {
  contactName: string;
  phoneNumber: string;
  message: string;
  messageType: string;
};

function parseMessage(texto: string): MessageDetails {
  try {
    const payload = JSON.parse(texto);
    const contact = payload.contacts?.[0];
    const message = payload.messages?.[0];

    return {
      contactName: contact?.profile?.name ?? '-',
      phoneNumber: contact?.wa_id ?? message?.from ?? '-',
      message: message?.text?.body ?? '-',
      messageType: message?.type ?? '-',
    };
  } catch {
    return {
      contactName: '-',
      phoneNumber: '-',
      message: 'Conteúdo inválido',
      messageType: '-',
    };
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(date));
}

export default function RequestList() {
  const [requests, setRequests] = useState<GatewayRequest[]>([]);
  const [readingId, setReadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        const response = await fetch('/api/gateway');
        if (!response.ok)
          throw new Error('Não foi possível carregar as requisições.');
        setRequests(await response.json());
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível carregar as requisições.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadRequests();
  }, []);

  async function markAsRead(id: number) {
    setReadingId(id);
    setError(null);
    try {
      const response = await fetch('/api/gateway/' + id + '/read', {
        method: 'PATCH',
      });
      if (!response.ok)
        throw new Error('Não foi possível marcar a requisição como lida.');
      setRequests((current) => current.filter((request) => request.id !== id));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível atualizar a requisição.',
      );
    } finally {
      setReadingId(null);
    }
  }

  if (isLoading)
    return (
      <p className='mx-auto w-full max-w-7xl border border-slate-200 bg-white p-4 text-slate-600'>
        Carregando requisições...
      </p>
    );

  if (requests.length === 0)
    return (
      <p className='mx-auto w-full max-w-7xl border border-slate-200 bg-white p-4 text-slate-600'>
        Nenhuma requisição pendente foi recebida ainda.
      </p>
    );

  return (
    <section className='mx-auto w-full max-w-7xl' aria-label='Lista de requisições'>
      {error && (
        <p className='mb-4 border border-red-200 bg-red-50 p-4 text-red-700' role='alert'>
          {error}
        </p>
      )}
      <div className='overflow-x-auto border border-slate-200 bg-white shadow-sm'>
        <table className='w-full min-w-240 text-left text-sm'>
          <thead className='border-b border-slate-200 bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-600'>
            <tr>
              <th className='px-4 py-3'>ID</th>
              <th className='px-4 py-3'>Contato</th>
              <th className='px-4 py-3'>Telefone</th>
              <th className='px-4 py-3'>Mensagem</th>
              <th className='px-4 py-3'>Tipo</th>
              <th className='px-4 py-3'>Recebida em</th>
              <th className='px-4 py-3'>Ação</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-200'>
            {requests.map((request) => {
              const details = parseMessage(request.texto);
              return (
                <tr className='align-top hover:bg-slate-50' key={request.id}>
                  <td className='px-4 py-4 font-mono text-slate-500'>#{request.id}</td>
                  <td className='px-4 py-4 font-medium text-slate-900'>
                    {details.contactName}
                  </td>
                  <td className='px-4 py-4 text-slate-700'>{details.phoneNumber}</td>
                  <td className='max-w-xs px-4 py-4 text-slate-700'>
                    <p className='wrap-break-word'>{details.message}</p>
                    <details className='mt-2'>
                      <summary className='cursor-pointer text-xs font-semibold text-teal-700 hover:text-teal-800'>
                        Detalhes
                      </summary>
                      <pre className='mt-2 max-w-sm overflow-x-auto whitespace-pre-wrap wrap-break-word bg-slate-100 p-3 font-mono text-xs leading-5 text-slate-700'>
                        {request.texto}
                      </pre>
                    </details>
                  </td>
                  <td className='px-4 py-4 text-slate-700'>{details.messageType}</td>
                  <td className='whitespace-nowrap px-4 py-4 text-slate-700'>
                    {formatDate(request.dataInclusao)}
                  </td>
                  <td className='px-4 py-4'>
                    <button
                      className='bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60'
                      type='button'
                      onClick={() => markAsRead(request.id)}
                      disabled={readingId === request.id}
                    >
                      {readingId === request.id ? 'Atualizando...' : 'Marcar lida'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
