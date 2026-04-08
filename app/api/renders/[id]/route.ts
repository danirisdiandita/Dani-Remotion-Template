import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { deleteMultipleFromS3, downloadToBuffer } from "@/lib/s3-utils";
import AdmZip from "adm-zip";
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
      }
    });

    if (!render || !render.s3Key) {
      return NextResponse.json({ error: "Render artifact not found or unauthorized" }, { status: 404 });
    }

    // Only process ZIP files for this special sharing logic
    const isZip = render.s3Key.toLowerCase().endsWith('.zip');
    if (!isZip) {
        return NextResponse.json({ error: "Not a ZIP file" }, { status: 400 });
    }

    const zipBuffer = await downloadToBuffer(render.s3Key);
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    const sortedFiles = zipEntries
      .filter((entry) => !entry.isDirectory && entry.entryName.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true, sensitivity: 'base' }))
      .map((entry) => {
        return {
          name: entry.entryName,
          content: entry.getData().toString("base64"),
          type: (() => {
            const ext = entry.entryName.split('.').pop()?.toLowerCase() || 'jpeg';
            if (ext === 'jpg') return 'image/jpeg';
            return `image/${ext}`;
          })(),
        };
      });

    return NextResponse.json({ files: sortedFiles });
  } catch (error) {
    console.error("❌ Error processing zip file:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const render = await prisma.render.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!render) {
      return Response.json({ error: "Render artifact not found or unauthorized" }, { status: 404 });
    }

    // Attempt to delete from S3
    if (render.s3Key) {
      try {
        await deleteMultipleFromS3([render.s3Key]);
        console.log(`🗑️ Successfully deleted S3 object: ${render.s3Key}`);
      } catch (s3Error) {
        console.error("⚠️ Failed to delete artifact from S3. Database record will still be deleted:", s3Error);
        // We continue so the DB doesn't end up out of sync if S3 throws a 404
      }
    }

    // Delete from Database
    await prisma.render.delete({
      where: { id: render.id }
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to delete render:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { checklisted } = body;

    const render = await prisma.render.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!render) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.render.update({
      where: { id },
      data: { checklisted }
    });

    return Response.json({ success: true, checklisted: updated.checklisted });
  } catch (error) {
    console.error("❌ Failed to update checklist:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
