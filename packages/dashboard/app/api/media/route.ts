import { Hono } from "hono";
import { db, sqlite } from "../../src/db/index.js";
import { media } from "../../src/db/schema.js";
import { nanoid } from "nanoid";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const app = new Hono();

const getUserId = (c: any) => c.get("userId");

// List user's media
app.get("/", async (c) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const results = sqlite.prepare(`
    SELECT id, filename, url, mime_type, size_bytes, width, height, created_at
    FROM media 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(userId);

  return c.json({ media: results });
});

// Upload media
app.post("/upload", async (c) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || typeof file === "string") {
    return c.json({ error: "file is required (multipart form data)" }, 400);
  }

  const id = `med_${nanoid(12)}`;
  const ext = file.name?.split(".").pop() || "bin";
  const filename = `${id}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filepath = join(UPLOAD_DIR, filename);
  const buffer = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(buffer));

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.API_PORT || 3001}`;
  const url = `${baseUrl}/uploads/${filename}`;

  sqlite.prepare(`
    INSERT INTO media (id, user_id, filename, url, mime_type, size_bytes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, filename, url, file.type || "application/octet-stream", buffer.byteLength);

  return c.json({ 
    media: {
      id,
      filename,
      url,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
    }
  }, 201);
});

// Delete media
app.delete("/:id", async (c) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  
  const item = sqlite.prepare("SELECT * FROM media WHERE id = ? AND user_id = ?").get(id, userId);
  if (!item) {
    return c.json({ error: "Media not found" }, 404);
  }

  // Delete file
  try {
    await unlink(join(UPLOAD_DIR, (item as any).filename));
  } catch {}

  sqlite.prepare("DELETE FROM media WHERE id = ?").run(id);
  return c.json({ deleted: true });
});

export default app;
