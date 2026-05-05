import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const renders = await prisma.render.findMany({
      where: { projectId: project.id, userId: session.user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

    return NextResponse.json(renders);
  } catch (error) {
    console.error("❌ Error fetching renders:", error);
    return NextResponse.json({ error: "Failed to fetch renders" }, { status: 500 });
  }
}
