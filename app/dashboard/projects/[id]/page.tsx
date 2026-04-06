"use client";

import { cn } from "@/lib/utils";
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
  ChevronRight,
  Play,
  Download,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { CompositionEditor } from "./composition-editor";
import { useRender } from "@/hooks/use-render";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project, isLoading, isError } = useProject(projectId);
  const { mutateAsync: renderVideo, isPending: isRendering } = useRender();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedComp, setSelectedComp] = useState<any>(null);
  const [renderCount, setRenderCount] = useState(1);
  const [isAsync, setIsAsync] = useState(false);

  const [localComps, setLocalComps] = useState<any[]>([]);

  // Browser Storage Persistence
  useEffect(() => {
    const savedAsync = localStorage.getItem(`v-async-${projectId}`);
    const savedCount = localStorage.getItem(`v-count-${projectId}`);
    
    if (savedAsync !== null) setIsAsync(savedAsync === "true");
    if (savedCount !== null) setRenderCount(parseInt(savedCount) || 1);
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem(`v-async-${projectId}`, String(isAsync));
  }, [isAsync, projectId]);

  useEffect(() => {
    localStorage.setItem(`v-count-${projectId}`, String(renderCount));
  }, [renderCount, projectId]);

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

  const canRender = localComps.length > 0 && localComps.every(comp => {
    const hasAsset = comp.assets?.some((ca: any) => 
      (project as any)?.compositionType === 'carousel' 
        ? ['video', 'image'].includes(ca.asset.type)
        : ca.asset.type === 'video'
    );
    const hasText = comp.overlayTexts?.length > 0;
    return (project as any)?.compositionType === 'carousel' ? hasAsset : (hasAsset && hasText);
  });

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
    const caption = formData.get("caption") as string;
    const counter = parseInt(formData.get("counter") as string);
    updateProject({ id: projectId, name, description, counter, caption }, { onSuccess: () => setSettingsOpen(false) });
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl overflow-hidden">
      {/* 1. Page Header & Breadcrumbs (Refined for Sidebar) */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Link 
            href="/dashboard/projects" 
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-all group w-fit"
          >
            <div className="flex size-6 items-center justify-center rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
              <ArrowLeft className="size-3.5" />
            </div>
            Back to Projects
          </Link>
          
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
            <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium">
              Home
            </Link>
            <ChevronRight className="size-2.5 opacity-30" />
            <Link href="/dashboard/projects" className="hover:text-foreground transition-colors font-medium">
              Projects
            </Link>
            <ChevronRight className="size-2.5 opacity-30" />
            <span className="text-foreground font-bold truncate max-w-[120px] sm:max-w-[200px]">
              {project.name}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {project.name}
              </h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-[10px] sm:text-xs">
                {localComps.length} Sequence{localComps.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 max-w-2xl">
              <span className="shrink-0">{project.description || "No description provided."}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-3 px-3 h-9 bg-muted/40 border rounded-md shadow-sm">
              <div className="flex items-center gap-2 pr-2 border-r">
                <Checkbox 
                  id="async-mode"
                  checked={isAsync}
                  onCheckedChange={(checked: boolean | "indeterminate") => setIsAsync(!!checked)}
                  className="size-4 rounded-full border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="async-mode" className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap cursor-pointer select-none">Async</Label>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Label htmlFor="render-count" className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Count</Label>
                <Input 
                  id="render-count"
                  type="number" 
                  min={1} 
                  max={50}
                  value={renderCount}
                  onChange={(e) => setRenderCount(parseInt(e.target.value) || 1)}
                  className="w-8 h-6 border-none bg-transparent p-0 text-center text-sm font-bold focus-visible:ring-0 appearance-none"
                />
              </div>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant={canRender ? "default" : "outline"}
                    size="sm"
                    disabled={!canRender || isRendering}
                    className={cn(
                      "h-9 shadow-lg transition-all duration-300 min-w-[100px]",
                      canRender ? "bg-green-600 hover:bg-green-700 text-white shadow-green-500/20" : "opacity-40 cursor-not-allowed bg-muted/30 border-dashed"
                    )}
                    onClick={async () => {
                      if (isAsync) {
                        try {
                          for (let i = 0; i < renderCount; i++) {
                            toast.info(`Queuing task ${i + 1} of ${renderCount}...`);
                            const res = await fetch("/api/render/async", {
                              method: "POST",
                              body: JSON.stringify({ projectId }),
                            });
                            if (!res.ok) throw new Error("Failed to queue task");
                            if (i < renderCount - 1) await new Promise(r => setTimeout(r, 500));
                          }
                          toast.success(`Successfully queued ${renderCount} cloud tasks!`);
                        } catch (err: any) {
                          toast.error(err.message || "Failed to batch queue tasks");
                        }
                      } else {
                        for (let i = 0; i < renderCount; i++) {
                          await renderVideo({ projectId, compositionType: (project as any)?.compositionType });
                          if (i < renderCount - 1) await new Promise(r => setTimeout(r, 1000));
                        }
                      }
                    }}
                  >
                    {isRendering ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        <span className="text-xs">{isAsync ? 'Queuing...' : 'Batching...'}</span>
                      </>
                    ) : (
                      <>
                        {isAsync ? <Sparkles className="mr-2 size-4" /> : <Play className={cn("mr-2 size-4", canRender && "fill-current animate-pulse")} />}
                        <span className="text-xs font-bold">{isAsync ? `Async ${renderCount}` : (renderCount > 1 ? `Batch ${renderCount}` : 'Render')}</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {!canRender && (
                  <TooltipContent className="max-w-[200px] text-[10px] p-3 space-y-1.5" side="bottom">
                    <p className="font-bold text-destructive flex items-center gap-1.5">
                      <Video className="size-3" /> Cannot Render Yet
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {(project as any)?.compositionType === 'carousel'
                        ? <>Each sequence must have at least <span className="text-white font-medium underline decoration-primary/50 underline-offset-2">1 Image/Video</span>.</>
                        : <>Each sequence must have at least <span className="text-white font-medium underline decoration-primary/50 underline-offset-2">1 Video</span> and <span className="text-white font-medium underline decoration-primary/50 underline-offset-2">1 Text Overlay</span> to proceed.</>}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <Link href={`/dashboard/projects/${projectId}/renders`}>
              <Button
                variant="secondary"
                size="sm"
                className="h-9 shadow-sm hover:shadow-md transition-shadow bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-none"
              >
                <Download className="mr-2 size-4" />
                <span className="hidden md:inline text-xs font-bold">Videos</span>
              </Button>
            </Link>
            
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="size-4 opacity-70" />
            </Button>
            
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="shadow-lg shadow-primary/20 h-9 font-bold text-xs"
            >
              <Plus className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Sequence</span>
            </Button>
          </div>
        </div>
      </div>

      <Separator className="opacity-50" />

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
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Timeline</h2>
            <GripHorizontal className="size-4 text-muted-foreground/30" />
          </div>
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
                  <div className="flex items-start gap-5 w-max pb-4">
                    {localComps.map((composition) => (
                      <SortableCompositionCard
                        key={composition.id}
                        composition={composition}
                        onClick={() => { setSelectedComp(composition); setEditorOpen(true); }}
                        onEdit={(comp) => { setSelectedComp(comp); setEditOpen(true); }}
                        onDelete={(id) => deleteComp(id)}
                      />
                    ))}

                    {/* Spacer or trailing add button */}
                    <button
                      onClick={() => setCreateOpen(true)}
                      className="shrink-0 w-[280px] h-[228px] rounded-xl border-2 border-dashed border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary group/add bg-muted/5 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="size-12 rounded-full bg-background border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform group-hover:shadow-md">
                        <Plus className="size-6" />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-bold">Add New Sequence</span>
                        <span className="text-[10px] opacity-60 uppercase tracking-widest font-mono">Insert at end</span>
                      </div>
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
                Update your project metadata and sequence captioning.
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
                <Label htmlFor="project-caption">Default Share Caption</Label>
                <Input id="project-caption" name="caption" defaultValue={project.caption || ""} placeholder="#Trending #Viral" />
                <p className="text-[10px] text-muted-foreground px-1">
                  Automatically attached to all completed social media renders.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-counter">Composition Counter</Label>
                <Input
                  id="project-counter"
                  name="counter"
                  type="number"
                  defaultValue={project.counter || 0}
                />
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

      <CompositionEditor 
        composition={selectedComp}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
}
