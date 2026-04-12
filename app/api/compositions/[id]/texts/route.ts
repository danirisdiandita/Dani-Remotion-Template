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
    const { id: compositionId } = await params;
    const body = await req.json();

    if (Array.isArray(body)) {
      const texts = await prisma.overlayText.createMany({
        data: body.map((item) => ({
          compositionId,
          text: item.text || "New Text",
          startTime: item.startTime || 0,
          endTime: item.endTime || 5,
          positionX: item.positionX || 50,
          positionY: item.positionY || 50,
          style: typeof item.style === "string" ? item.style : JSON.stringify(item.style || {}),
        })),
      });
      return NextResponse.json(texts);
    }

    const { text, startTime, endTime, positionX, positionY, style } = body;

    const overlayText = await prisma.overlayText.create({
      data: {
        compositionId,
        text: text || "New Text",
        startTime: startTime || 0,
        endTime: endTime || 5,
        positionX: positionX || 50,
        positionY: positionY || 50,
        style: typeof style === "string" ? style : JSON.stringify(style || {}),
      },
    });

    return NextResponse.json(overlayText);
  } catch (error) {
    console.error("POST OverlayText Error:", error);
    return NextResponse.json({ error: "Failed to create overlay text" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: compositionId } = await params;
    
    const texts = await prisma.overlayText.findMany({
        where: { compositionId },
        orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(texts);
}
