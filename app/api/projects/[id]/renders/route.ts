import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getUserByApiKey } from "@/lib/api-key";
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

    return NextResponse.json(renders);
  } catch (error) {
    console.error("❌ Error fetching renders:", error);
    return NextResponse.json({ error: "Failed to fetch renders" }, { status: 500 });
  }
}
