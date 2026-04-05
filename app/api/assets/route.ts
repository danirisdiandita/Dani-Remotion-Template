import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, s3Key, type, description } = await req.json();

    const asset = await prisma.asset.create({
      data: {
        userId: session.user.id,
        name,
        s3Key,
        type,
        description,
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error("POST Asset Error:", error);
    return NextResponse.json({ error: "Failed to save asset metadata" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assets);
}
