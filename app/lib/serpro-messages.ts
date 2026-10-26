import { getSerproToken, invalidateSerproToken } from "@/app/lib/serpro-auth";

export class SerproSendError extends Error {
  constructor(public readonly status?: number) {
    super("Serpro send failed.");
    this.name = "SerproSendError";
  }
}

function getConfig() {
  const baseUrl = process.env.SERPRO_BASE_URL;
  const phoneNumberId = process.env.SERPRO_PHONE_NUMBER_ID;
  const wabaId = process.env.SERPRO_WABA_ID;
  const templateName = process.env.SERPRO_TEMPLATE_NAME;

  if (!baseUrl || !phoneNumberId || !wabaId || !templateName) {
    throw new SerproSendError();
  }

  return { baseUrl, phoneNumberId, wabaId, templateName };
}

export async function sendSerproTemplate(destinatario: string) {
  const { baseUrl, phoneNumberId, wabaId, templateName } = getConfig();
  const url = new URL(
    `/client/${encodeURIComponent(phoneNumberId)}/v2/requisicao/mensagem/template`,
    baseUrl,
  );
  const body = JSON.stringify({
    nomeTemplate: templateName,
    wabaId,
    destinatarios: [destinatario],
  });

  const send = async () =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getSerproToken()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });

  let response = await send();

  // Cached token may have been revoked before its expiry.
  if (response.status === 401) {
    invalidateSerproToken();
    response = await send();
  }

  if (!response.ok) {
    throw new SerproSendError(response.status);
  }

  return response.json().catch(() => null);
}
