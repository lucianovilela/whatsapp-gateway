import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const keyLength = 64;
const saltLength = 16;
const defaultParams = { N: 16384, r: 8, p: 1 };

let dummyHash: Promise<string> | undefined;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(saltLength);
  const key = await deriveKey(password, salt, defaultParams);
  const { N, r, p } = defaultParams;

  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

// Sem usuario, compara com um hash ficticio para manter o tempo de resposta constante.
export async function verifyPassword(password: string, storedHash: string | null) {
  if (storedHash === null) {
    dummyHash ??= hashPassword(randomBytes(saltLength).toString("base64"));
    await verifyPassword(password, await dummyHash);
    return false;
  }

  const [scheme, n, r, p, salt, key] = storedHash.split("$");

  if (scheme !== "scrypt" || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, "base64");
  const actual = await deriveKey(password, Buffer.from(salt, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}