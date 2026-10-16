import { timingSafeEqual } from "node:crypto";

export function isValidAdminSecret(providedSecret: string | null) {
  const configuredSecret = process.env.ADMIN_SECRET;

  if (!providedSecret || !configuredSecret) {
    return false;
  }

  const provided = Buffer.from(providedSecret);
  const configured = Buffer.from(configuredSecret);

  return (
    provided.length === configured.length && timingSafeEqual(provided, configured)
  );
}