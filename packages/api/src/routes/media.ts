import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { media } from "../db/schema.js";
import { nanoid } from "nanoid";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const app = new Hono();

// List media
app.get("/", async (c) => {
  const results = await db.select().from(media).limit(100);
  return c.json({ media: results });
});

// Upload media
app.post("/upload", async (c) => {
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

  const [item] = await db
    .insert(media)
    .values({
      id,
      filename,
      url,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
    })
    .returning();

  return c.json({ media: item }, 201);
});

// Delete media
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!item) return c.json({ error: "Media not found" }, 404);

  // Delete file
  try {
    await unlink(join(UPLOAD_DIR, item.filename));
  } catch {}

  await db.delete(media).where(eq(media.id, id));
  return c.json({ deleted: true });
});

export default app;
