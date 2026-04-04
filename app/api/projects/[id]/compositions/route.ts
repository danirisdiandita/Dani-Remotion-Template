import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: projectId } = await params;
    const { name, description } = await req.json();

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { 
        id: projectId, 
        userId: session.user.id 
      }
    });

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get count of existing compositions for indexing
    const compositionsCount = await prisma.composition.count({
        where: { projectId }
    });

    const composition = await prisma.composition.create({
      data: {
        projectId,
        name: name || `Sequence #${compositionsCount + 1}`,
        description,
        order: compositionsCount + 1,
      },
    });

    return NextResponse.json(composition);
  } catch (error) {
    console.error("POST Composition Error:", error);
    return NextResponse.json({ error: "Failed to create composition" }, { status: 500 });
  }
}
