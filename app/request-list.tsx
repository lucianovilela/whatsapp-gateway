"use client";

import { useState } from "react";

type GatewayRequest = {
  id: number;
  texto: string;
  status: number;
};

function formatText(texto: string) {
  try {
    return JSON.stringify(JSON.parse(texto), null, 2);
  } catch {
    return texto;
  }
}

export default function RequestList({
  initialRequests,
}: {
  initialRequests: GatewayRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [readingId, setReadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markAsRead(id: number) {
    setReadingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/gateway/${id}/read`, {
        method: "PATCH",
      });
      if (!response.ok)
        throw new Error("Não foi possível marcar a requisição como lida.");
      setRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, status: 1 } : request,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível atualizar a requisição.",
      );
    } finally {
      setReadingId(null);
    }
  }

  if (requests.length === 0)
    return (
      <p className="mx-auto w-full max-w-4xl border border-slate-200 bg-white p-4 text-slate-600">
        Nenhuma requisição foi recebida ainda.
      </p>
    );

  return (
    <section
      className="mx-auto w-full max-w-4xl"
      aria-label="Lista de requisições"
    >
      {error && (
        <p
          className="mb-4 border border-red-200 bg-red-50 p-4 text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="grid gap-4">
        {requests.map((request) => {
          const isRead = request.status === 1;
          return (
            <article
              className={`border border-slate-200 border-l-4 ${isRead ? "border-l-slate-400" : "border-l-teal-600"} bg-white p-5 shadow-sm`}
              key={request.id}
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="font-mono text-sm text-slate-500">
                  #{request.id}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${isRead ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                >
                  {isRead ? "Lida" : "Pendente"}
                </span>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words border border-slate-100 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-700">
                {formatText(request.texto)}
              </pre>
              {!isRead && (
                <button
                  className="mt-4 bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  onClick={() => markAsRead(request.id)}
                  disabled={readingId === request.id}
                >
                  {readingId === request.id
                    ? "Atualizando..."
                    : "Marcar como lida"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
