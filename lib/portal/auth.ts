import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PORTAL_ATTEMPT_TTL_SECONDS,
  PORTAL_AUTH_COOKIE,
  PORTAL_AUTH_TTL_SECONDS,
  PORTAL_TEST_ATTEMPT_COOKIE,
} from "@/lib/portal/constants";
import { getPortalJwtSecret } from "@/lib/portal/env";
import { signJwt, verifyJwt } from "@/lib/portal/jwt";
import { ensurePortalSchema } from "@/lib/portal/schema";

export type PortalAuthPayload = {
  sub: number;
  email: string;
  iat: number;
  exp: number;
};

export type PortalAttemptPayload = {
  ownerUserId: number;
  testId: number;
  slug: string;
  nome: string;
  email: string | null;
  phone: string | null;
  iat: number;
  exp: number;
};

export type PortalPublicAccessPayload = {
  kind: "portal-public-access";
  ownerUserId: number;
  testId: number;
  slug: string;
  token?: string | null;
  iat: number;
  exp: number;
};

export type PortalUser = {
  id: number;
  email: string;
  name: string | null;
  is_active: boolean;
};

export function createPortalAuthToken(userId: number, email: string) {
  const secret = getPortalJwtSecret();
  return signJwt({ sub: userId, email }, secret, PORTAL_AUTH_TTL_SECONDS);
}

export function readPortalAuthToken(token: string) {
  const secret = getPortalJwtSecret();
  return verifyJwt<PortalAuthPayload>(token, secret);
}

export function setPortalAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(PORTAL_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PORTAL_AUTH_TTL_SECONDS,
  });
}

export function clearPortalAuthCookie(response: NextResponse) {
  response.cookies.set(PORTAL_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function createPortalAttemptToken(payload: Omit<PortalAttemptPayload, "iat" | "exp">) {
  const secret = getPortalJwtSecret();
  return signJwt(payload, secret, PORTAL_ATTEMPT_TTL_SECONDS);
}

export function readPortalAttemptToken(token: string) {
  const secret = getPortalJwtSecret();
  return verifyJwt<PortalAttemptPayload>(token, secret);
}

export function createPortalPublicAccessToken(
  payload: Omit<PortalPublicAccessPayload, "iat" | "exp" | "kind">,
  ttlSeconds: number,
) {
  const secret = getPortalJwtSecret();
  const safeTtl = Math.max(60, ttlSeconds);
  return signJwt(
    {
      kind: "portal-public-access" as const,
      ...payload,
    },
    secret,
    safeTtl,
  );
}

export function readPortalPublicAccessToken(token: string) {
  const secret = getPortalJwtSecret();
  const payload = verifyJwt<PortalPublicAccessPayload>(token, secret);
  if (!payload) return null;
  if (payload.kind !== "portal-public-access") return null;
  return payload;
}

export function setPortalAttemptCookie(response: NextResponse, token: string) {
  response.cookies.set(PORTAL_TEST_ATTEMPT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PORTAL_ATTEMPT_TTL_SECONDS,
  });
}

export function clearPortalAttemptCookie(response: NextResponse) {
  response.cookies.set(PORTAL_TEST_ATTEMPT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getPortalUserFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = readPortalAuthToken(token);
  if (!payload) return null;

  await ensurePortalSchema();

  const [user] = await db<PortalUser[]>`
    SELECT id, email, name, is_active
    FROM public.portal_users
    WHERE id = ${payload.sub}
      AND email = ${payload.email}
      AND is_active = TRUE
    LIMIT 1
  `;

  return user ?? null;
}

export async function requirePortalUser() {
  const user = await getPortalUserFromCookies();
  if (!user) return null;
  return user;
}
