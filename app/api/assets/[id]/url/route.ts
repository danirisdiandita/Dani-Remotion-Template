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
    const { searchParams } = new URL(req.url);
    const disposition = searchParams.get("disposition") || "inline";

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!asset || !asset.s3Key) {
      return NextResponse.json({ error: "Asset not found or unauthorized" }, { status: 404 });
    }

    const mimeMap: Record<string, string> = {
      video: "video/mp4",
      image: "image/jpeg",
      audio: "audio/mpeg",
    };

    const mimeType = mimeMap[asset.type] || "application/octet-stream";
    const contentDisposition = disposition === "attachment"
      ? `attachment; filename="${asset.name}"`
      : undefined;

    const downloadUrl = await getPresignedDownloadUrl(asset.s3Key, mimeType, contentDisposition);

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Error generating asset download URL:", error);
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }
}
