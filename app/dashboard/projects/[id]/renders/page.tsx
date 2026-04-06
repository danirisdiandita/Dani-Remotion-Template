
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/s3-utils";
import { RendersClient } from "./renders-client";

export default async function ProjectRendersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id }
  });

  if (!project) {
    redirect("/dashboard/projects");
  }

  const renders = await prisma.render.findMany({
    where: { projectId: project.id, userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });

  const isCarousel = (project as any).compositionType === "carousel";

  // Generate ultra-secure AWS presigned URLs directly in the server component for instant click-to-download
  const renderList = await Promise.all(renders.map(async (r) => {
    let downloadUrl = "";
    if (r.s3Key) {
      // Request browser attachment header so clicking triggers file download natively
      const mimeType = isCarousel ? "application/zip" : "video/mp4";
      const extension = isCarousel ? "zip" : "mp4";
      downloadUrl = await getPresignedDownloadUrl(r.s3Key, mimeType, `attachment; filename="Sequence-Action-${r.id.slice(-4)}.${extension}"`);
    }
    return { ...r, downloadUrl };
  }));


  console.log('project.compositionType', project.compositionType)

  return (
    <RendersClient
      projectId={projectId}
      projectName={project.name}
      compositionType={(project as any).compositionType || "video"}
      initialRenders={renderList as any}
    />
  );
}
