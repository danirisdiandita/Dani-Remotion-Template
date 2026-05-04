import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "10")));
    const skip = (page - 1) * pageSize;

    const [keys, totalCount] = await Promise.all([
      prisma.apiKey.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          key: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }),
      prisma.apiKey.count({
        where: { userId: session.user.id },
      }),
    ]);

    return Response.json({
      keys,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error("❌ Failed to list API keys:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let name: string | null = null;
    try {
      const body = await req.json();
      name = body.name || null;
    } catch {}

    const key = `ve_${randomUUID().replace(/-/g, "")}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name,
        key,
      },
      select: {
        id: true,
        name: true,
        key: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return Response.json({ apiKey }, { status: 201 });
  } catch (error) {
    console.error("❌ Failed to generate API key:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing key id" }, { status: 400 });
    }

    const existing = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to revoke API key:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
