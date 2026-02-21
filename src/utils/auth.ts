import { SignJWT, jwtVerify } from 'jose';

const ENCODER = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashBuffer = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hashBuffer.length);
  combined.set(salt);
  combined.set(hashBuffer, salt.length);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const hash = combined.slice(16);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      ENCODER.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    
    const computedHash = new Uint8Array(bits);
    if (computedHash.length !== hash.length) return false;
    
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash[i] ^ hash[i];
    }
    return result === 0;
  } catch {
    return false;
  }
}

export async function signToken(
  payload: { userId: string; email: string },
  secret: string
): Promise<string> {
  return new SignJWT({ userId: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(ENCODER.encode(secret));
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<{ userId: string; email: string }> {
  const { payload } = await jwtVerify(token, ENCODER.encode(secret));
  return payload as { userId: string; email: string };
}

export function generateId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}${hex.slice(0, 16)}`;
}
