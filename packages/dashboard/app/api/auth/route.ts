import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { users, apiKeys, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { generateId } from "lucia";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "relay-social-secret-change-in-prod";
const JWT_EXPIRY = "7d";

const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
};

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  
  if (action === "keys") {
    // Create API key
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }
    try {
      const payload = verifyToken(token);
      const body = await request.json();
      const apiKeyId = generateId(16);
      const apiKey = `relay_${crypto.randomUUID().replace(/-/g, "")}`;
      
      await db.insert(apiKeys).values({
        id: apiKeyId,
        userId: payload.userId,
        name: body.name || "New Key",
        key: apiKey,
      });

      return NextResponse.json({ id: apiKeyId, name: body.name || "New Key", key: apiKey });
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  }

  // Signup or Login
  const { email, password } = await request.json();
  
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Signup
  if (!action) {
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await hash(password);
    const userId = generateId(16);
    
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      tier: "free",
    });

    const apiKeyId = generateId(16);
    const apiKey = `relay_${crypto.randomUUID().replace(/-/g, "")}`;
    
    await db.insert(apiKeys).values({
      id: apiKeyId,
      userId,
      name: "Default",
      key: apiKey,
    });

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    return NextResponse.json({
      user: { id: userId, email, tier: "free" },
      token,
      apiKey,
    });
  }

  // Login
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verify(user.passwordHash, password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  return NextResponse.json({
    user: { id: user.id, email: user.email, tier: user.tier },
    token,
    apiKeys: keys.map(k => ({ id: k.id, name: k.name, key: k.key })),
  });
}

// GET /api/auth/me or /api/auth/keys
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  try {
    const payload = verifyToken(token);
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));

    return NextResponse.json({
      user: { id: user.id, email: user.email, tier: user.tier },
      apiKeys: keys.map(k => ({ id: k.id, name: k.name, key: k.key })),
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
