import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { name, description, counter } = await req.json();

    const project = await prisma.project.update({
      where: { 
        id, 
        userId: session.user.id 
      },
      data: {
        name,
        description,
        counter: counter !== undefined ? parseInt(counter) : undefined,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("PATCH Project Error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
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
    
    await prisma.project.delete({
      where: { 
        id, 
        userId: session.user.id 
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Project Error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    const project = await prisma.project.findFirst({
      where: { 
        id, 
        userId: session.user.id 
      },
      include: {
        compositions: {
          include: {
            assets: {
              include: {
                asset: true
              }
            },
            overlayTexts: true
          }
        }
      }
    });

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("GET Project Detail Error:", error);
    return NextResponse.json({ error: "Failed to fetch project detail" }, { status: 500 });
  }
}
