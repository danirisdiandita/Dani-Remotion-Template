import { prisma } from "@/lib/prisma";
import { getPresignedUploadUrlByKey } from "@/lib/s3-utils";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

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

type BulkItem = {
  caption?: string | null;
  fileName: string;
  fileType?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const user = await getUserByApiKey(req);

    if (!user) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    let body: { projectId: string; items: BulkItem[] };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Expected JSON body" }, { status: 400 });
    }

    const { projectId, items } = body;

    if (!projectId) {
      return Response.json({ error: "Missing projectId" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: "Missing or empty items array" },
        { status: 400 }
      );
    }

    if (items.length > 100) {
      return Response.json(
        { error: "Max 100 items per request" },
        { status: 400 }
      );
    }

    // Verify project exists and user owns it (or is admin)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.userId !== user.id) {
      return Response.json(
        { error: "Project does not belong to you" },
        { status: 403 }
      );
    }

    const results = await Promise.all(
      items.map(async (item: BulkItem) => {
        if (!item.fileName) {
          throw new Error("Each item must have a fileName");
        }

        const ext = item.fileName.split(".").pop() || "mp4";
        const s3Key = `uploads/${user.id}/${randomUUID()}.${ext}`;

        const { presignedUrl } = await getPresignedUploadUrlByKey(
          s3Key,
          item.fileType || "video/mp4"
        );

        const render = await prisma.render.create({
          data: {
            userId: user.id,
            projectId,
            s3Key,
            caption: item.caption || null,
            status: "pending",
          },
        });

        return {
          id: render.id,
          s3Key: render.s3Key,
          caption: render.caption,
          presignedUrl,
        };
      })
    );

    return Response.json(
      {
        success: true,
        projectId,
        items: results,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Failed bulk upload:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserByApiKey(req);

    if (!user) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    let body: { ids: string[] };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Expected JSON body" }, { status: 400 });
    }

    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { error: "Missing or empty ids array" },
        { status: 400 }
      );
    }

    // Verify all renders belong to the user and are in "pending" state
    const renders = await prisma.render.findMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
    });

    if (renders.length !== ids.length) {
      return Response.json(
        { error: "One or more render IDs not found or not owned by you" },
        { status: 404 }
      );
    }

    const updated = await prisma.render.updateMany({
      where: {
        id: { in: ids },
        userId: user.id,
        status: "pending",
      },
      data: {
        status: "completed",
      },
    });

    return Response.json({
      success: true,
      confirmedCount: updated.count,
    });
  } catch (error) {
    console.error("❌ Failed to confirm bulk upload:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
