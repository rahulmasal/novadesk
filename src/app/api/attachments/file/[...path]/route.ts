import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve } from "path";

export const dynamic = 'force-dynamic';

const UPLOADS_DIR = resolve(process.cwd(), "uploads");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filename = path.join("/");

  try {
    // Prevent path traversal by resolving and ensuring the path stays within uploads dir
    const filePath = resolve(join(UPLOADS_DIR, filename));
    if (!filePath.startsWith(UPLOADS_DIR + "\\") && filePath !== UPLOADS_DIR) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);

    const ext = filename.split(".").pop() || "";
    const mimeTypes: Record<string, string> = {
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "gif": "image/gif",
      "webp": "image/webp",
      "svg": "image/svg+xml",
    };

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}