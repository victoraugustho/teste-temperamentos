import { createHmac, timingSafeEqual } from "node:crypto";

type JwtBasePayload = {
  iat: number;
  exp: number;
};

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return Buffer.from(base64 + padding, "base64");
}

function signSegment(data: string, secret: string) {
  return toBase64Url(createHmac("sha256", secret).update(data).digest());
}

export function signJwt<T extends object>(
  payload: T,
  secret: string,
  ttlSeconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: T & JwtBasePayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = signSegment(unsigned, secret);

  return `${unsigned}.${signature}`;
}

export function verifyJwt<T extends JwtBasePayload>(
  token: string,
  secret: string,
) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signSegment(unsigned, secret);

  const providedBuffer = Buffer.from(encodedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const headerRaw = fromBase64Url(encodedHeader).toString("utf-8");
    const header = JSON.parse(headerRaw) as { alg?: string; typ?: string };
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }

    const payloadRaw = fromBase64Url(encodedPayload).toString("utf-8");
    const payload = JSON.parse(payloadRaw) as T;
    if (!payload?.exp || !payload?.iat) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
}
