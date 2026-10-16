const maxEmailLength = 254;
const minPasswordLength = 8;
const maxPasswordLength = 128;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Credentials = { email: string; password: string };

export function isValidPassword(password: unknown): password is string {
  return (
    typeof password === "string" &&
    password.length >= minPasswordLength &&
    password.length <= maxPasswordLength
  );
}

export function parseCredentials(body: unknown): Credentials | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || !isValidPassword(password)) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length > maxEmailLength || !emailPattern.test(normalizedEmail)) {
    return null;
  }

  return { email: normalizedEmail, password };
}