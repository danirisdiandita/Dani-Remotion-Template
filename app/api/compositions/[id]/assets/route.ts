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
    const { assetId, text, order } = await req.json();

    const count = await prisma.compositionAsset.count({
      where: { compositionId }
    });

    const compositionAsset = await prisma.compositionAsset.create({
      data: {
        compositionId,
        assetId,
        text,
        order: order ?? count,
      },
    });

    return NextResponse.json(compositionAsset);
  } catch (error) {
    console.error("POST CompositionAsset Error:", error);
    return NextResponse.json({ error: "Failed to link asset to composition" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: compositionId } = await params;

  const assets = await prisma.compositionAsset.findMany({
    where: { compositionId },
    include: {
      asset: true,
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(assets);
}
