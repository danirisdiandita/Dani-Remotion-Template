import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

  return (
    <RendersClient
      projectId={projectId}
      projectName={project.name}
      compositionType={(project as any).compositionType || "video"}
    />
  );
}
