import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "./config";
import { read } from "./db";
import { AppError } from "./errors";

const COOKIE = "penny_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const secret = () => new TextEncoder().encode(config.sessionSecret);

export async function startSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.secureCookies,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return read((db) => db.users.find((u) => u.id === payload.sub)) ?? null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("Please sign in first.", 401);
  return user;
}

export async function requirePageUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
