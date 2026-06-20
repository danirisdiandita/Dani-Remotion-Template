import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getUserByApiKey } from "@/lib/api-key";
import { getPresignedDownloadUrl } from "@/lib/s3-utils";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    let userId: string | undefined;

    const apiKeyUser = await getUserByApiKey(req);
    if (apiKeyUser) {
      userId = apiKeyUser.id;
    } else {
      const session = await auth.api.getSession({
        headers: await headers()
      });
      userId = session?.user?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const presigned = searchParams.get("presigned") === "true";

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const renders = await prisma.render.findMany({
      where: { projectId: project.id, userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

    if (!presigned) {
      return NextResponse.json(renders);
    }

    const rendersWithUrl = await Promise.all(
      renders.map(async (render) => {
        if (!render.s3Key) return render;
        try {
          const url = await getPresignedDownloadUrl(render.s3Key);
          return { ...render, s3Url: url };
        } catch {
          return render;
        }
      })
    );

    return NextResponse.json(rendersWithUrl);
  } catch (error) {
    console.error("❌ Error fetching renders:", error);
    return NextResponse.json({ error: "Failed to fetch renders" }, { status: 500 });
  }
}
