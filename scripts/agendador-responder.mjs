const intervalMs = 30_000;
const url = process.env.RESPONDER_URL;
const secret = process.env.CRON_SECRET;

if (!url || !secret) {
  console.error("Defina RESPONDER_URL e CRON_SECRET.");
  process.exit(1);
}

async function tick() {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(intervalMs * 4),
    });
    console.log(new Date().toISOString(), response.status, await response.text());
  } catch (error) {
    console.error(new Date().toISOString(), "falha:", error.message);
  }
  // Scheduled after completion so runs never overlap.
  setTimeout(tick, intervalMs);
}

tick();
