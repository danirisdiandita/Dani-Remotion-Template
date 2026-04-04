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
    const { items } = await req.json(); // Array of { id, order }

    // Sequential update or transaction
    await prisma.$transaction(
      items.map((item: { id: string; order: number }) =>
        prisma.composition.update({
          where: { 
            id: item.id,
            projectId // security check
          },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST Reorder Error:", error);
    return NextResponse.json({ error: "Failed to reorder compositions" }, { status: 500 });
  }
}
