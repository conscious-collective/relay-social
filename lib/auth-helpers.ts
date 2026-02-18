import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const getSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || "relay-social-secret-change-in-prod"
  );

export async function signToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; email: string }> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as { userId: string; email: string };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashBuffer = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hashBuffer.length);
  combined.set(salt);
  combined.set(hashBuffer, salt.length);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const storedHashBytes = combined.slice(16);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const computedHash = new Uint8Array(bits);
    if (computedHash.length !== storedHashBytes.length) return false;
    return computedHash.every((byte, i) => byte === storedHashBytes[i]);
  } catch {
    return false;
  }
}

export function generateId(prefix = ""): string {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function getAuthUser(
  req: NextRequest
): Promise<{ userId: string; email: string } | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return await verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}
