"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, Loader2, Sparkles, BookOpen, Info } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BulkRenderDialogProps {
  projectId: string;
  projectName: string;
  compositionType: string;
}

export function BulkRenderDialog({ projectId, projectName, compositionType }: BulkRenderDialogProps) {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBatchStart = async () => {
    try {
      const data = JSON.parse(jsonInput);
      if (!Array.isArray(data)) {
        throw new Error("Input must be a JSON array of sequences");
      }

      setIsProcessing(true);

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        toast.info(`Queuing render ${i + 1} of ${data.length}...`);

        // Match payload based on composition type
        let payload: any = { projectId, compositionType };

        if (compositionType === 'nicstudy') {
          Object.assign(payload, item);
        } else {
          // For Dani/Carousel, we used videoSequence key
          payload.videoSequence = item.videoSequence || item;
        }

        const res = await fetch("/api/render/async", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(`Failed at index ${i}: ${err.error || "Unknown error"}`);
        }

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

  const getFormatExample = () => {
    if (compositionType === 'nicstudy') {
      return `[
  {
    "title": "Study Tip #1",
    "tips": ["Tip A", "Tip B"],
    "handle": "@study"
  },
  {
    "title": "Study Tip #2",
    "tips": ["Tip C"],
    "handle": "@study"
  }
]`;
    }
    return `[
  {
    "videoSequence": [
      { "text": "Slide 1 text" },
      { "text": "Slide 2 text" }
    ]
  },
  {
    "videoSequence": [
      { "src": "optional_s3_key.mp4", "text": "Slide 1 with custom video" }
    ]
  }
]`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-9 px-3 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all" />}>
        <Sparkles className="size-4 sm:mr-2 text-primary" />
        <span className="hidden sm:inline font-bold text-xs">Bulk Render</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden">
        <Tabs defaultValue="editor" className="w-full">
          <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-xl">Bulk Video Generation</DialogTitle>
              <TabsList className="h-8">
                <TabsTrigger value="editor" className="text-[10px] uppercase font-bold tracking-wider">Editor</TabsTrigger>
                <TabsTrigger value="guide" className="text-[10px] uppercase font-bold tracking-wider">Guide</TabsTrigger>
              </TabsList>
            </div>
            <DialogDescription>
              Generating for project: <span className="font-bold text-foreground">{projectName}</span>
            </DialogDescription>
          </div>

          <div className="p-6">
            <TabsContent value="editor" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-json" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Play className="size-3 fill-current" /> JSON Array Input
                </Label>
                <Textarea
                  id="bulk-json"
                  placeholder={getFormatExample()}
                  className="font-mono text-xs min-h-[350px] bg-muted/20 border-border/50 focus:border-primary/50 transition-colors"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                />
                <div className="flex items-center gap-2 p-2 rounded bg-blue-500/5 border border-blue-500/10">
                  <Info className="size-3.5 text-blue-500 shrink-0" />
                  <p className="text-[10px] text-blue-600 font-medium">
                    {compositionType === 'video' || compositionType === 'carousel'
                      ? '"src" is optional. If omitted, the system will rotate through your project assets automatically.'
                      : 'Each object in the array represents one complete video/carousel render.'}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="guide" className="mt-0 space-y-4 max-h-[450px] overflow-y-auto pr-2">
              <div className="space-y-6">
                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                    <BookOpen className="size-4 text-primary" /> How it works
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-2 ml-4 list-disc">
                    <li>This tool queues multiple render tasks in the background.</li>
                    <li>You provide an <strong>Array of Objects</strong>. Each object corresponds to one video.</li>
                    <li>For <span className="text-foreground font-bold">Dani (Video)</span> and <span className="text-foreground font-bold">Carousel</span>, use the <code>videoSequence</code> key.</li>
                    <li>For <span className="text-foreground font-bold">Nic Study</span>, use keys like <code>title</code>, <code>tips</code> (array), and <code>handle</code>.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                    <Sparkles className="size-4 text-yellow-500" /> Smart Logic
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If you are generating standard videos and don't want to specify the video source every time, just leave the <code className="bg-muted px-1 rounded">src</code> empty or omit it. The system will look at your project&apos;s sequence database and pick the next available video clip based on your current rotation counter.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                    Format Reference ({compositionType})
                  </h4>
                  <pre className="p-3 rounded-lg bg-black/90 text-[10px] text-emerald-400 font-mono overflow-x-auto">
                    {getFormatExample()}
                  </pre>
                </section>
              </div>
            </TabsContent>
          </div>

          <div className="px-6 py-4 border-t bg-muted/10">
            <DialogFooter>
              <Button
                onClick={handleBatchStart}
                disabled={isProcessing || !jsonInput}
                className="w-full h-11 shadow-lg shadow-primary/20"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Queueing {jsonInput ? JSON.parse(jsonInput).length : 0} Renders...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 size-4 fill-current" />
                    Start Bulk Generation
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
