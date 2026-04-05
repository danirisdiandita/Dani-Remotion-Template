"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Type, Music, Image as ImageIcon, Video, Loader2, Plus, FileText, X } from "lucide-react";
import { useCompositionAssets, useAddCompositionAsset, useDeleteCompositionAsset } from "@/hooks/use-composition-assets";
import { useCompositionTexts, useAddCompositionText, useDeleteCompositionText, useUpdateCompositionText } from "@/hooks/use-composition-texts";
import { useUploadAsset } from "@/hooks/use-assets";
import { useDropzone } from "react-dropzone";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface CompositionEditorProps {
  composition: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompositionEditor({ composition, open, onOpenChange }: CompositionEditorProps) {
  const { data: assets, isLoading: assetsLoading } = useCompositionAssets(composition?.id);
  const { data: texts, isLoading: textsLoading } = useCompositionTexts(composition?.id);

  const { mutateAsync: uploadAsset } = useUploadAsset();
  const { mutateAsync: addAsset } = useAddCompositionAsset(composition?.id);
  const { mutate: deleteAsset } = useDeleteCompositionAsset(composition?.id);

  const { mutateAsync: addText, isPending: isAddingText } = useAddCompositionText(composition?.id);
  const { mutate: updateText } = useUpdateCompositionText(composition?.id);
  const { mutate: deleteText } = useDeleteCompositionText(composition?.id);

  // --- Asset Upload (Batch) ---
  const [uploadingCount, setUploadingCount] = useState(0);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadingCount(acceptedFiles.length);
    for (const file of acceptedFiles) {
      try {
        const asset = await uploadAsset({ file });
        await addAsset({ assetId: asset.id });
      } catch (err) {
        toast.error(`Failed: ${file.name}`);
      } finally {
        setUploadingCount((prev) => Math.max(0, prev - 1));
      }
    }
  }, [uploadAsset, addAsset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': [],
      'image/*': [],
      'audio/*': []
    }
  });

  // --- Text Overlay ---
  const [selectedTab, setSelectedTab] = useState<string>("assets");
  const [showAddTextForm, setShowAddTextForm] = useState(false);
  const [pendingAddText, setPendingAddText] = useState("");
  const [editingTexts, setEditingTexts] = useState<Record<string, string>>({});

  const handleCreateLayers = async () => {
    if (!pendingAddText.trim()) return;
    const lines = pendingAddText.split(/\r?\n/).map(l => l.trim()).filter(l => !!l);
    
    try {
      for (const line of lines) {
        await addText({ text: line });
      }
      setPendingAddText("");
      setShowAddTextForm(false);
    } catch (err) {
      toast.error("Failed to add layer(s)");
    }
  };

  const handleUpdateLayer = (id: string) => {
    const text = editingTexts[id];
    if (text === undefined) return;
    updateText({ id, text }, {
      onSuccess: () => {
        setEditingTexts(prev => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
        toast.success("Updated");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex h-full">
          {/* Left: Preview Area (Vertical 9:16) */}
          <div className="hidden md:flex w-[30%] min-w-[400px] max-w-[600px] bg-black items-center justify-center relative shrink-0 border-r border-border/10 p-12">
            <div className="aspect-[9/16] h-full max-h-[80vh] bg-muted/10 rounded-lg border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
              <Video className="size-16 text-muted-foreground/20 animate-pulse" />
              <div className="mt-4 text-[10px] text-muted-foreground/40 font-mono uppercase tracking-[0.2em]">Sequence Preview</div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[10px] text-muted-foreground/60 font-mono">
              <span>1080x1920</span>
              <span className="text-primary/60">00:00:00</span>
            </div>
          </div>

          {/* Right: Controls Area */}
          <div className="flex-1 flex flex-col bg-background min-w-0">
            <DialogHeader className="p-6 border-b border-border/50 bg-card/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Video className="size-5 text-primary" />
                    {composition?.name || `Sequence #${composition?.order}`}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Configure assets and text layers for this sequence
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden p-6">
              <Tabs defaultValue="assets" className="h-full flex flex-col" onValueChange={(value) => setSelectedTab(value)} value={selectedTab}>
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/60 p-1.5 rounded-xl border border-border/50">
                  <TabsTrigger value="assets" className={`flex items-center justify-center gap-2.5 py-2.5 text-xs font-bold transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50 data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-md rounded-lg ${selectedTab === "assets" ? "bg-primary text-primary-foreground shadow-md" : ""}`}>
                    <ImageIcon className="size-4" />
                    Audio & Video
                  </TabsTrigger>
                  <TabsTrigger value="texts" className={`flex items-center justify-center gap-2.5 py-2.5 text-xs font-bold transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50 data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-md rounded-lg ${selectedTab === "texts" ? "bg-primary text-primary-foreground shadow-md" : ""}`}>
                    <Type className="size-4" />
                    Text Overlays
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="assets" className="h-full mt-0 focus-visible:ring-0 w-full">
                    <div className="flex flex-col h-full w-full space-y-4">
                      {/* Dropzone Area */}
                      <div
                        {...getRootProps()}
                        className={cn(
                          "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-3xl transition-all cursor-pointer group hover:bg-muted/10",
                          isDragActive ? "border-primary bg-primary/5 scale-[0.99] shadow-inner" : "border-border/50 bg-muted/5 hover:border-primary/30"
                        )}
                      >
                        <input {...getInputProps()} />
                        <div className={cn(
                          "size-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
                          isDragActive ? "bg-primary text-white rotate-6 scale-110 shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:rotate-3"
                        )}>
                          {uploadingCount > 0 ? <Loader2 className="size-10 animate-spin" /> : <Upload className="size-8" />}
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-bold tracking-tight">
                            {uploadingCount > 0 ? `Uploading ${uploadingCount}...` : isDragActive ? "Drop the files here" : "Drag & drop media here"}
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            {isDragActive ? "Release to start upload" : "multiple files supported"}
                          </p>
                        </div>
                      </div>

                      <ScrollArea className="flex-1 pr-2">
                        {assetsLoading ? (
                          <div className="flex justify-center p-12"><Loader2 className="animate-spin opacity-20" /></div>
                        ) : (
                          <div className="space-y-2 pb-4">
                            {assets?.map((ca: any) => (
                              <div key={ca.id} className="group flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 transition-all shadow-sm">
                                <div className="size-14 rounded-lg bg-black/5 flex items-center justify-center shrink-0 border border-border/50 overflow-hidden relative">
                                  {ca.asset.type === "video" ? <Video className="size-6 text-muted-foreground/40" /> : ca.asset.type === "image" ? <ImageIcon className="size-6 text-muted-foreground/40" /> : <Music className="size-6 text-muted-foreground/40" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{ca.asset.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase font-bold tracking-tighter border border-border/50">{ca.asset.type}</span>
                                    <span className="text-[9px] text-muted-foreground/40 font-mono">ID: {ca.asset.id.slice(-6)}</span>
                                  </div>
                                </div>
                                <Button size="icon-xs" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive hover:bg-destructive/5" onClick={() => deleteAsset(ca.id)}>
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  <TabsContent value="texts" className="h-full mt-0 focus-visible:ring-0">
                    <div className="flex flex-col h-full space-y-4">
                      <div className="flex items-center justify-between bg-muted/10 p-3 rounded-lg border border-border/50">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Text Overlays</h3>
                          <p className="text-[10px] text-muted-foreground/60">Manage layered captions</p>
                        </div>
                        {!showAddTextForm && (
                          <Button size="sm" variant="outline" onClick={() => setShowAddTextForm(true)} className="border-primary/20 hover:border-primary/50 text-primary bg-primary/5">
                            <Plus className="mr-2 size-4" />
                            Add layer
                          </Button>
                        )}
                      </div>

                      {showAddTextForm && (
                        <div className="space-y-4 p-4 border rounded-xl bg-muted/5 transition-all">
                          <Textarea 
                            value={pendingAddText}
                            onChange={(e) => setPendingAddText(e.target.value)}
                            placeholder="Type text... (Multiline for multiple layers)"
                            className="bg-background"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1" onClick={handleCreateLayers} disabled={!pendingAddText.trim() || isAddingText}>
                              {isAddingText ? <Loader2 className="animate-spin size-4 mr-2" /> : <FileText className="size-4 mr-2" />}
                              Create Layer(s)
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setShowAddTextForm(false); setPendingAddText(""); }}>
                              <X className="size-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <ScrollArea className="flex-1 pr-2">
                        {textsLoading ? (
                          <div className="flex justify-center p-12"><Loader2 className="animate-spin opacity-20" /></div>
                        ) : (
                          <div className="space-y-3 pb-4">
                            {texts?.map((ot: any) => {
                              const pending = editingTexts[ot.id];
                              const isEdited = pending !== undefined && pending !== ot.text;
                              
                              return (
                                <div key={ot.id} className="group flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/30 shadow-sm hover:bg-card/50 hover:border-primary/10 transition-all relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                  <div className="size-10 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 border border-border/50">
                                    <Type className="size-5 text-muted-foreground/40" />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Content</Label>
                                      {isEdited && <Button size="xs" variant="secondary" className="h-6 px-2 text-[10px]" onClick={() => handleUpdateLayer(ot.id)}>Save Sync</Button>}
                                    </div>
                                    <Textarea
                                      className="min-h-[60px] bg-background/50 border-border/50 focus:border-primary/30 text-sm p-3 rounded-xl"
                                      value={pending ?? ot.text}
                                      onChange={(e) => setEditingTexts(v => ({ ...v, [ot.id]: e.target.value }))}
                                    />
                                  </div>
                                  <Button size="icon-xs" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive hover:bg-destructive/5" onClick={() => deleteText(ot.id)}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
