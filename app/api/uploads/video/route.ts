import { prisma } from "@/lib/prisma";
import { uploadFileToS3 } from "@/lib/s3-utils";
import { randomUUID } from "crypto";

async function getUserByApiKey(req: Request) {
  const key =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!key) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    select: { userId: true },
  });

  if (!apiKey) return null;

  await prisma.apiKey.update({
    where: { key },
    data: { lastUsedAt: new Date() },
  });

  return { id: apiKey.userId };
}

export async function POST(req: Request) {
  try {
    const user = await getUserByApiKey(req);

    if (!user) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return Response.json({ error: "Expected multipart form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || null;
    const projectId = (formData.get("projectId") as string) || null;

    if (!file) {
      return Response.json({ error: "Missing file field" }, { status: 400 });
    }

    if (!file.type.startsWith("video/")) {
      return Response.json({ error: "File must be a video" }, { status: 400 });
    }

    console.log(`📤 Uploading video: ${file.name} (${file.size} bytes)`);

    const ext = file.name.split(".").pop() || "mp4";
    const s3Key = `uploads/${user.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const os = await import("node:os");

    const tmpPath = path.join(os.tmpdir(), `upload-${randomUUID()}.${ext}`);
    await fs.writeFile(tmpPath, buffer);

    try {
      await uploadFileToS3(tmpPath, s3Key, file.type);
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }

    const render = await prisma.render.create({
      data: {
        userId: user.id,
        projectId: projectId || null,
        s3Key,
        caption,
        status: "completed",
        duration: null,
      },
    });

    return Response.json({
      success: true,
      render: {
        id: render.id,
        s3Key: render.s3Key,
        status: render.status,
        caption: render.caption,
      },
    });
  } catch (error) {
    console.error("❌ Failed to upload video:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
