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
    const body = await req.json();

    const compositionAsset = await prisma.compositionAsset.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(compositionAsset);
  } catch (error) {
    console.error("PATCH CompositionAsset Error:", error);
    return NextResponse.json({ error: "Failed to update asset sequence" }, { status: 500 });
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
    await prisma.compositionAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE CompositionAsset Error:", error);
    return NextResponse.json({ error: "Failed to delete from sequence" }, { status: 500 });
  }
}
