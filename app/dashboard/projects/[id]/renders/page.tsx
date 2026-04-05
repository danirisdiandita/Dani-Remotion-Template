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

  // Generate ultra-secure AWS presigned URLs directly in the server component for instant click-to-download
  const renderList = await Promise.all(renders.map(async (r) => {
    let downloadUrl = "";
    if (r.s3Key) {
       // Request browser attachment header so clicking triggers file download natively
       downloadUrl = await getPresignedDownloadUrl(r.s3Key, "video/mp4", `attachment; filename="Sequence-Action-${r.id.slice(-4)}.mp4"`);
    }
    return { ...r, downloadUrl };
  }));

  return (
    <RendersClient 
      projectId={projectId} 
      projectName={project.name} 
      initialRenders={renderList as any} 
    />
  );
}
