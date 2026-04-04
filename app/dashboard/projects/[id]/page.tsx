"use client";

import { useProject, useUpdateProject } from "@/hooks/use-project";
import { useCreateComposition, useUpdateComposition, useDeleteComposition, useReorderCompositions } from "@/hooks/use-composition";
import { use, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Plus, 
  Loader2, 
  Settings, 
  Video,
  GripHorizontal,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableCompositionCard } from "./sortable-composition-card";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project, isLoading, isError } = useProject(projectId);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedComp, setSelectedComp] = useState<any>(null);

  const [localComps, setLocalComps] = useState<any[]>([]);

  // Sync server data to local state for smooth DnD
  useEffect(() => {
    if (project?.compositions) {
      setLocalComps([...project.compositions].sort((a, b) => a.order - b.order));
    }
  }, [project?.compositions]);

  const { mutate: updateProject, isPending: isUpdatingProject } = useUpdateProject();
  const { mutate: create, isPending: isCreating } = useCreateComposition(projectId);
  const { mutate: update, isPending: isUpdating } = useUpdateComposition(projectId);
  const { mutate: deleteComp } = useDeleteComposition(projectId);
  const { mutate: reorderComps } = useReorderCompositions(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localComps.findIndex((c) => c.id === active.id);
      const newIndex = localComps.findIndex((c) => c.id === over.id);
      
      const newComps = arrayMove(localComps, oldIndex, newIndex);
      setLocalComps(newComps);

      // Persist to DB
      const items = newComps.map((item, index) => ({ id: item.id, order: index }));
      reorderComps(items);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h3 className="text-lg font-medium text-destructive">Project Not Found</h3>
        <Link href="/dashboard/projects" className="mt-4">
          <Button variant="outline">
            <ChevronLeft className="mr-2 size-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    create({ name, description }, { onSuccess: () => setCreateOpen(false) });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    update({ id: selectedComp.id, name, description }, { onSuccess: () => setEditOpen(false) });
  };

  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const counter = parseInt(formData.get("counter") as string);
    updateProject({ id: projectId, name, description, counter }, { onSuccess: () => setSettingsOpen(false) });
  };

  return (
    <div className="space-y-8 flex flex-col min-h-screen">
      {/* 1. Header & Breadcrumbs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/projects" className="hover:text-foreground transition-colors group flex items-center">
             Projects
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/30" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {project.name}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
                {localComps.length} Sequence{localComps.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:flex" 
                onClick={() => setSettingsOpen(true)}
            >
              <Settings className="mr-2 size-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Main Video Preview (Vertical 9:16 for Mobile) */}
      <div className="flex justify-center">
        <Card className="w-full max-w-[340px] border-border/60 bg-muted/20 overflow-hidden shadow-2xl shadow-primary/5">
          <div className="aspect-[9/16] relative flex flex-col items-center justify-center bg-black/90 group">
            <Video className="size-16 text-muted-foreground/20 animate-pulse" />
            <div className="mt-4 text-muted-foreground font-medium tracking-tight text-center px-4">
              Portrait Preview Placeholder
            </div>
            <div className="absolute bottom-4 right-4 text-[10px] text-muted-foreground bg-black/40 px-2 py-1 rounded backdrop-blur-md border border-white/5 uppercase tracking-widest font-mono">
              1080x1920
            </div>
          </div>
          <CardContent className="p-3 border-t border-border/50 bg-background/50 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase font-bold tracking-tight">
                   <div className="size-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                   Draft
                </div>
             </div>
             <div className="flex items-center gap-2">
               <Button size="xs" variant="secondary" className="font-bold text-[9px] uppercase h-6 px-2">
                  Preview
               </Button>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Horizontal Compositions Sequence */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Timeline</h2>
            <GripHorizontal className="size-4 text-muted-foreground/40" />
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="rounded-full shadow-lg h-9 px-4">
              <Plus className="mr-2 size-4" />
              Add Sequence
          </Button>
        </div>

        <div className="relative group/timeline px-1">
          {localComps.length > 0 ? (
            <div className="overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
               <DndContext 
                 sensors={sensors}
                 collisionDetection={closestCenter}
                 onDragEnd={handleDragEnd}
               >
                 <SortableContext 
                    items={localComps.map(c => c.id)}
                    strategy={horizontalListSortingStrategy}
                 >
                   <div className="flex items-start gap-5">
                      {localComps.map((composition) => (
                        <SortableCompositionCard 
                          key={composition.id} 
                          composition={composition}
                          onEdit={(comp) => { setSelectedComp(comp); setEditOpen(true); }}
                          onDelete={(id) => deleteComp(id)}
                        />
                      ))}

                      {/* Spacer or trailing add button */}
                      <button 
                        onClick={() => setCreateOpen(true)}
                        className="shrink-0 w-[180px] h-[157px] rounded-xl border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary group/add"
                      >
                         <Plus className="size-5 group-hover/add:scale-110 transition-transform" />
                         <span className="text-xs font-semibold">Add Next</span>
                      </button>
                   </div>
                 </SortableContext>
               </DndContext>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-center border-dashed bg-muted/5 border-2 rounded-2xl border-border/50">
               <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-5 rotate-12 group-hover:rotate-0 transition-transform">
                 <Video className="size-7 text-muted-foreground" />
               </div>
               <h3 className="text-xl font-bold">No sequences yet</h3>
               <p className="text-muted-foreground text-sm max-w-[280px] mb-8 leading-relaxed">
                 Build your video timeline by adding sequence blocks. Drag them to reorder.
               </p>
               <Button onClick={() => setCreateOpen(true)} size="lg" className="rounded-full px-8">
                 <Plus className="mr-2 size-4" />
                 Create Sequence
               </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreate} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Add sequence</DialogTitle>
              <DialogDescription>
                A sequence represents a logical block of your video production.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Sequence Name</Label>
                <Input id="name" name="name" placeholder="e.g. Intro hook" required autoFocus />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input id="description" name="description" placeholder="What happens in this part?" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isCreating} className="w-full h-10">
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreating ? "Adding..." : "Add to Timeline"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdate} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Edit Sequence</DialogTitle>
              <DialogDescription>
                Modify details of your composition sequence.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Sequence Name</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={selectedComp?.name || ""} 
                  placeholder="Sequence Name" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input 
                  id="edit-description" 
                  name="description" 
                  defaultValue={selectedComp?.description || ""} 
                  placeholder="Description" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isUpdating} className="w-full h-10">
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Project Settings</DialogTitle>
              <DialogDescription>
                Update your project metadata and sequencing counter.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input id="project-name" name="name" defaultValue={project.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Input id="project-description" name="description" defaultValue={project.description || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-counter">Composition Counter</Label>
                <Input 
                  id="project-counter" 
                  name="counter" 
                  type="number" 
                  defaultValue={project.counter || 0} 
                />
                <p className="text-[10px] text-muted-foreground px-1">
                  Affects the auto-numbering of new compositions.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isUpdatingProject} className="w-full h-10">
                {isUpdatingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdatingProject ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
