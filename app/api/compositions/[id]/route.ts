import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getCompositionWithProject(id: string, userId: string) {
    return await prisma.composition.findFirst({
        where: {
            id,
            project: {
                userId
            }
        }
    });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { name, description, order } = await req.json();

    const composition = await getCompositionWithProject(id, session.user.id);
    if (!composition) {
        return NextResponse.json({ error: "Composition not found" }, { status: 404 });
    }

    const updated = await prisma.composition.update({
      where: { id },
      data: {
        name,
        description,
        order: order !== undefined ? order : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH Composition Error:", error);
    return NextResponse.json({ error: "Failed to update composition" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    const composition = await getCompositionWithProject(id, session.user.id);
    if (!composition) {
        return NextResponse.json({ error: "Composition not found" }, { status: 404 });
    }

    await prisma.composition.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Composition Error:", error);
    return NextResponse.json({ error: "Failed to delete composition" }, { status: 500 });
  }
}
