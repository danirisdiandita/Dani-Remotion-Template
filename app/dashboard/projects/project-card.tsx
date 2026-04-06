"use client";

import { useUpdateProject, useDeleteProject } from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2, Video, Download, Settings } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { mutate: update, isPending: isUpdating } = useUpdateProject();
  const { mutate: deleteProj, isPending: isDeleting } = useDeleteProject();

  async function handleDelete() {
    deleteProj(project.id, {
      onSuccess: () => setIsDeleteOpen(false)
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) return;

    update({ id: project.id, name, description }, {
      onSuccess: () => setIsEditOpen(false)
    });
  }

  return (
    <div className="group relative flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-200 gap-4">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="flex size-10 sm:size-12 items-center justify-center rounded-lg border border-border bg-muted/50 group-hover:bg-primary/5 text-muted-foreground group-hover:text-primary transition-colors">
          <Video className="size-5 sm:size-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/projects/${project.id}`}
              className="text-lg font-semibold hover:underline decoration-primary' underline-offset-4 truncate"
            >
              {project.name}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">
            {project.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-border/50">
        <div className="flex flex-col sm:items-end">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Last Updated
          </span>
          <span className="text-xs text-foreground font-medium">
            {new Date(project.updatedAt || project.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon-sm" className="hover:bg-muted" />}>
              <Pencil className="size-4" />
              <span className="sr-only">Edit</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleUpdate} className="space-y-6">
                <DialogHeader>
                  <DialogTitle>Edit Project</DialogTitle>
                  <DialogDescription>
                    Modify the details of your project.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`name-${project.id}`}>Project Name</Label>
                    <Input
                      id={`name-${project.id}`}
                      name="name"
                      defaultValue={project.name}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`description-${project.id}`}>Description (Optional)</Label>
                    <Input
                      id={`description-${project.id}`}
                      name="description"
                      defaultValue={project.description || ""}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isUpdating} className="w-full">
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  disabled={isDeleting}
                />
              }
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              <span className="sr-only">Delete</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the project
                  <strong> {project.name}</strong> and all associated video compositions and assets.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete Project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Link href={`/dashboard/projects/${project.id}/renders`}>
            <Button variant="outline" size="sm" className="flex border-1 border-gray-200 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10 hover:text-blue-700">
              <span className="hidden sm:flex">Rendered</span>
              <Download className="ml-2 size-3" />
            </Button>
          </Link>

          <Link href={`/dashboard/projects/${project.id}`}>
            <Button variant="outline" size="sm" className="flex border-1 border-gray-200">
              <span className="hidden sm:flex">Config</span>
              <Settings className="ml-2 size-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
