import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filename = path.join("/");
  
  try {
    const filePath = join(process.cwd(), "uploads", filename);
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
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}