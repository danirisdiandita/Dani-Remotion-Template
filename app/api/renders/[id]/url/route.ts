import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/s3-utils";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const render = await prisma.render.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        project: true
      }
    });

    if (!render || !render.s3Key) {
      return NextResponse.json({ error: "Render artifact not found or unauthorized" }, { status: 404 });
    }

    const isCarousel = (render.project as any).compositionType === "carousel";
    const isNicstudy = (render.project as any).compositionType === "nicstudy";
    const isZip = isCarousel || isNicstudy;

    const mimeType = isZip ? "application/zip" : "video/mp4";
    const extension = isZip ? "zip" : "mp4";
    const contentDisposition = `attachment; filename="Sequence-Action-${render.id.slice(-4)}.${extension}"`;

    const downloadUrl = await getPresignedDownloadUrl(render.s3Key, mimeType, contentDisposition);

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("❌ Error generating download URL:", error);
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }
}
