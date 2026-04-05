import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { deleteMultipleFromS3 } from "@/lib/s3-utils";

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
