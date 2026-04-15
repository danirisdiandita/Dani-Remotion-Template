"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "@/hooks/use-project";

export function BatchRenderButton() {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: projects } = useProjects();

  const handleBatchStart = async () => {
    if (!projectId) {
      toast.error("Please select a project");
      return;
    }

    try {
      const data = JSON.parse(jsonInput);
      if (!Array.isArray(data)) {
        throw new Error("Input must be a JSON array of sequences");
      }

      setIsProcessing(true);
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        toast.info(`Queuing render ${i + 1} of ${data.length}...`);
        
        const res = await fetch("/api/render/async", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            compositionType: "video",
            videoSequence: item.videoSequence || item
          }),
        });

        if (!res.ok) {
           const err = await res.json();
           throw new Error(`Failed at index ${i}: ${err.error || "Unknown error"}`);
        }

        // Small delay to prevent rate limit issues on task creation if many
        if (i < data.length - 1) await new Promise(r => setTimeout(r, 200));
      }

      toast.success(`Successfully queued ${data.length} renders!`);
      setOpen(false);
      setJsonInput("");
    } catch (error: any) {
      toast.error(error.message || "Invalid JSON input");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Sparkles className="mr-2 h-4 w-4" />
        Batch Render
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Batch Video Generation</DialogTitle>
          <DialogDescription>
            Paste a JSON array of video sequences to generate multiple renders at once.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project">Target Project</Label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select a project...</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="json">JSON Array</Label>
            <Textarea
              id="json"
              placeholder='[{"videoSequence": [{"text": "Hello world"}]}, {"videoSequence": [{"text": "Video 2"}]}]'
              className="font-mono text-xs min-h-[300px]"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Tip: "src" is optional. If missing, it will use the project&apos;s existing assets.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleBatchStart} 
            disabled={isProcessing || !jsonInput || !projectId}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4 fill-current" />
                Start Batch Render
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
