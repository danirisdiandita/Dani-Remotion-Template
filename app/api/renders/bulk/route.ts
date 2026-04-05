import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { deleteMultipleFromS3 } from "@/lib/s3-utils";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Verify ownership and grab keys for S3 bulk delete
    const renders = await prisma.render.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      }
    });

    if (renders.length === 0) {
      return Response.json({ success: true });
    }

    const s3Keys = renders.map(r => r.s3Key).filter(Boolean) as string[];

    // Bulk Delete from S3
    if (s3Keys.length > 0) {
      try {
        await deleteMultipleFromS3(s3Keys);
        console.log(`🗑️ Successfully initiated bulk delete for ${s3Keys.length} items in S3`);
      } catch (s3Error) {
        console.error("⚠️ Failed to bulk delete from S3:", s3Error);
      }
    }

    // Bulk Delete from DB
    await prisma.render.deleteMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      }
    });

    return Response.json({ success: true, count: renders.length });
  } catch (error) {
    console.error("❌ Failed bulk delete renders:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
