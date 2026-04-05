import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ textId: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { textId } = await params;
    const body = await req.json();

    const text = await prisma.overlayText.update({
      where: { id: textId },
      data: {
        ...body,
        style: typeof body.style === "object" ? JSON.stringify(body.style) : body.style,
      },
    });

    return NextResponse.json(text);
  } catch (error) {
    console.error("PATCH OverlayText Error:", error);
    return NextResponse.json({ error: "Failed to update overlay text" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ textId: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { textId } = await params;
    await prisma.overlayText.delete({
      where: { id: textId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE OverlayText Error:", error);
    return NextResponse.json({ error: "Failed to delete overlay text" }, { status: 500 });
  }
}
