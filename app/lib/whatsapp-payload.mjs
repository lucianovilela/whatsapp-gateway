export function extractText(payload) {
  const body = payload?.messages?.[0]?.text?.body;
  return typeof body === "string" ? body : null;
}

export function extractWaId(payload) {
  const waId = payload?.contacts?.[0]?.wa_id;
  return typeof waId === "string" && /^\d+$/.test(waId) ? waId : null;
}