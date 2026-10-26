const refreshMarginMs = 60 * 1000;
const defaultExpiresInSeconds = 3600;

export class SerproAuthError extends Error {
  constructor() {
    super("Serpro authentication failed.");
    this.name = "SerproAuthError";
  }
}

type CachedToken = { accessToken: string; expiresAt: number };

// Kept on globalThis so the token survives dev hot reloads.
const globalForSerpro = globalThis as unknown as {
  serproToken?: CachedToken;
  serproTokenPromise?: Promise<CachedToken>;
};

async function fetchSerproToken(): Promise<CachedToken> {
  const baseUrl = process.env.SERPRO_BASE_URL;
  const clientId = process.env.SERPRO_CLIENT_ID;
  const clientSecret = process.env.SERPRO_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new SerproAuthError();
  }

  const response = await fetch(new URL("/oauth2/token", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new SerproAuthError();
  }

  const body: unknown = await response.json().catch(() => null);
  const accessToken = (body as { access_token?: unknown } | null)?.access_token;
  const expiresIn = (body as { expires_in?: unknown } | null)?.expires_in;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new SerproAuthError();
  }

  const lifetimeSeconds =
    typeof expiresIn === "number" && expiresIn > 0
      ? expiresIn
      : defaultExpiresInSeconds;

  return { accessToken, expiresAt: Date.now() + lifetimeSeconds * 1000 };
}

export async function getSerproToken(): Promise<string> {
  const cached = globalForSerpro.serproToken;

  if (cached && Date.now() < cached.expiresAt - refreshMarginMs) {
    return cached.accessToken;
  }

  // Concurrent callers share a single in-flight login.
  globalForSerpro.serproTokenPromise ??= fetchSerproToken()
    .then((token) => {
      globalForSerpro.serproToken = token;
      return token;
    })
    .finally(() => {
      globalForSerpro.serproTokenPromise = undefined;
    });

  return (await globalForSerpro.serproTokenPromise).accessToken;
}

export function invalidateSerproToken() {
  globalForSerpro.serproToken = undefined;
}