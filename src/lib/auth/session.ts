import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/generated/prisma/enums";

const SESSION_COOKIE = "oqran-session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export interface SessionPayload {
  userId: string;
  role: Role;
}

/** Thrown when AUTH_JWT_SECRET is missing/too short — distinguished from an
 * unexpected bug so it surfaces as its own client-facing message and status
 * (see withErrorHandling) instead of a generic 500, on both sign-in and
 * create-account, which both sign a session at their final step. */
export class SessionConfigError extends Error {}

function getSecretKey() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      "[session] AUTH_JWT_SECRET is not set or too short (need >= 32 chars) — refusing to sign sessions"
    );
    throw new SessionConfigError(
      "Sign-in is temporarily unavailable. Please try again shortly."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { userId: payload.userId, role: payload.role as Role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
