"use client";

import { useProjects } from "@/hooks/use-project";
import { ProjectCard } from "./project-card";
import { CreateProjectButton } from "./create-project-button";
import { BatchRenderButton } from "./batch-render-button";
import { Loader2 } from "lucide-react";

export default function ProjectsPage() {
  const { data: projects, isLoading, isError, error } = useProjects();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h3 className="text-lg font-medium text-destructive">Error Loading Projects</h3>
        <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your video production projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <BatchRenderButton />
          <CreateProjectButton />
        </div>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="flex min-h-[100px] flex-col items-center justify-center rounded-lg border border-dashed text-center p-12">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="text-muted-foreground text-sm max-w-[250px]">
              Create your first project to start generating videos.
            </p>
            <div className="pt-2">
              <CreateProjectButton />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            //@ts-ignore - bypassing Prisma union types
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
