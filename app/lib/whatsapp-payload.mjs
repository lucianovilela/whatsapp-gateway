export function extractWaId(payload) {
  const waId = payload?.contacts?.[0]?.wa_id;
  return typeof waId === "string" && /^\d+$/.test(waId) ? waId : null;
}