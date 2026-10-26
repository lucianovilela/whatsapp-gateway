export function extractWaId(payload: unknown) {
  const waId = (payload as { contacts?: { wa_id?: unknown }[] } | null)
    ?.contacts?.[0]?.wa_id;
  return typeof waId === "string" && /^\d+$/.test(waId) ? waId : null;
}
