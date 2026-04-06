import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { deleteFromS3 } from "@/lib/s3-utils";

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
    
    const compAsset = await prisma.compositionAsset.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!compAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await prisma.compositionAsset.delete({
      where: { id },
    });

    if (compAsset.asset?.s3Key) {
      await deleteFromS3(compAsset.asset.s3Key).catch(console.error);
      await prisma.asset.delete({ where: { id: compAsset.assetId } }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE CompositionAsset Error:", error);
    return NextResponse.json({ error: "Failed to delete from sequence" }, { status: 500 });
  }
}
