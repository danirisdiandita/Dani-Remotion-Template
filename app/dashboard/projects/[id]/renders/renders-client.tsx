"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Calendar,
  Search,
  Loader2,
  Video,
  Share,
  Copy,
  Check,
  ChevronLeft,
  Trash2,
  RotateCcw,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RenderRecord = {
  id: string;
  status: string;
  s3Key: string | null;
  createdAt: Date;
  caption: string | null;
  checklisted: boolean;
  downloadUrl: string;
};

interface RendersClientProps {
  projectId: string;
  projectName: string;
  compositionType: string;
  initialRenders: RenderRecord[];
}

export function RendersClient({ projectId, projectName, compositionType, initialRenders }: RendersClientProps) {
  const isZip = compositionType === "carousel" || compositionType === "nicstudy";
  const label = isZip ? "File" : "Video";
  const labelPlural = isZip ? "Files" : "Videos";

  const router = useRouter();

  const parsedRenders = useMemo(() => {
    return initialRenders.map(r => ({
      ...r,
      checklisted: !!r.checklisted,
      createdAt: new Date(r.createdAt)
    }));
  }, [initialRenders]);

  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogLoading, setShareDialogLoading] = useState(false);
  const [shareFiles, setShareFiles] = useState<File[] | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<RenderRecord | null>(null);

  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    const next = new Set<string>();
    parsedRenders.forEach(r => {
      if (r.checklisted) next.add(r.id);
    });
    setCheckedIds(next);
  }, [parsedRenders]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleToggleCheck = async (id: string, isChecked: boolean) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (isChecked) next.add(id);
      else next.delete(id);
      return next;
    });

    try {
      const res = await fetch(`/api/renders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklisted: isChecked })
      });
      if (!res.ok) throw new Error("Failed to sync checklist");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update checklisted status");
      setCheckedIds(prev => {
        const next = new Set(prev);
        if (!isChecked) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (checkedIds.size === 0) return;
    setIsDeletingBulk(true);
    try {
      const res = await fetch("/api/renders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(checkedIds) })
      });
      if (!res.ok) throw new Error("Failed to bulk delete");
      toast.success(`Deleted ${checkedIds.size} ${labelPlural.toLowerCase()}.`);
      setCheckedIds(new Set());
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Bulk delete failed");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleDeleteIndividual = async (id: string) => {
    try {
      const res = await fetch(`/api/renders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete ${label.toLowerCase()}`);
      toast.success(`${label} deleted.`);
      setCheckedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Deletion failed");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleCopyAction = async (video: RenderRecord) => {
    try {
      const textToCopy = video.caption || video.id;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(video.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success(video.caption ? "Caption copied" : "ID copied");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleShareMobile = async (video: RenderRecord) => {
    if (!video.downloadUrl) {
      toast.error("Asset unavailable");
      return;
    }
    setSharingId(video.id);
    setShareDialogOpen(true);
    setShareDialogLoading(true);
    setShareFiles(null);
    setSelectedVideo(video);
    try {
      if (isZip) {
        const response = await fetch(`/api/renders/${video.id}`);
        if (!response.ok) throw new Error("Failed to extract files");
        const data = await response.json();
        
        if (!data.files || data.files.length === 0) {
          toast.error("No files found in archive");
          setShareDialogOpen(false);
          return;
        }

        const filesArray = data.files.map((file: any) => {
          const byteCharacters = atob(file.content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: file.type });

          return new File([blob], file.name, { type: file.type });
        });
        setShareFiles(filesArray);
      } else {
        const response = await fetch(video.downloadUrl);
        const blob = await response.blob();
        const file = new File([blob], `render-${video.id.slice(0, 8)}.mp4`, { type: 'video/mp4' });
        setShareFiles([file]);
      }
    } catch (err: any) {
      toast.error(`Failed to load ${label.toLowerCase()} for sharing`);
      setShareDialogOpen(false);
    } finally {
      setShareDialogLoading(false);
      setSharingId(null);
    }
  };

  const handleShareConfirm = async () => {
    if (!shareFiles || shareFiles.length === 0 || !selectedVideo) return;
    try {
      if (navigator.canShare && navigator.canShare({ files: shareFiles })) {
        await navigator.share({
          files: shareFiles,
          title: `${isZip ? 'Photos' : 'Video'} from ${projectName}`,
          text: selectedVideo.caption || `Check out ${isZip ? 'these photos' : 'this video'}!`
        });
        toast.success("Shared successfully");
        setShareDialogOpen(false);
      } else {
        toast.error("Sharing not supported or files too large for this device.");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error("Share failed: " + err.message);
      }
    }
  };

  const filtered = parsedRenders.filter(gen =>
    (gen.caption || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    gen.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 lg:p-6 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Project
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Exported {labelPlural}</h1>
            <p className="text-sm text-muted-foreground">
              View and manage all generated {labelPlural.toLowerCase()} for {projectName}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {checkedIds.size > 0 && (
              <Button
                variant="destructive"
                disabled={isDeletingBulk}
                onClick={handleBulkDelete}
              >
                {isDeletingBulk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete ({checkedIds.size})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RotateCcw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 py-2 border-y">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search caption or ID..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {parsedRenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 lg:p-24 border-2 border-dashed rounded-lg bg-muted/20 text-center space-y-4">
          <div className="p-4 bg-primary/10 rounded-full">
            {isZip ? <ImageIcon className="h-6 w-6 text-primary" /> : <Video className="h-6 w-6 text-primary" />}
          </div>
          <h3 className="text-lg font-semibold tracking-tight">No {labelPlural.toLowerCase()} exported yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            {labelPlural} rendered from the sequence editor will appear securely here.
          </p>
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button className="mt-4">
              Go to sequence editor
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((gen) => (
            <Card key={gen.id} className="overflow-hidden relative group border bg-card text-card-foreground gap-y-2">
              <div className="absolute top-4 left-4 z-20">
                <Checkbox
                  checked={checkedIds.has(gen.id)}
                  onCheckedChange={(c) => handleToggleCheck(gen.id, !!c)}
                  className="bg-background shadow-md border-muted-foreground"
                />
              </div>
              <CardContent className="p-0">
                <div className="p-4 flex flex-col gap-4">
                  <div className="space-y-1.5 pr-2">
                    <h3
                      className="font-semibold text-sm line-clamp-2 leading-snug cursor-pointer group-hover:text-primary transition-colors"
                      onClick={() => handleToggleCheck(gen.id, !checkedIds.has(gen.id))}
                    >
                      {gen.caption || `Render #${gen.id.slice(0, 8).toUpperCase()}`}
                    </h3>
                    <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {gen.createdAt.toLocaleDateString()}
                      <span>&middot;</span>
                      ID: {gen.id.slice(0, 6)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {gen.downloadUrl ? (
                      <a href={gen.downloadUrl} download className="flex-1">
                        <Button variant="default" size="sm" className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </a>
                    ) : (
                      <Button variant="default" size="sm" disabled className="flex-1">
                        <span>Unavailable</span>
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleShareMobile(gen)}
                      disabled={sharingId === gen.id || !gen.downloadUrl}
                      title="Share Native"
                    >
                      {sharingId === gen.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyAction(gen)}
                      title="Copy Caption"
                    >
                      {copiedId === gen.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setItemToDelete(gen.id);
                        setDeleteDialogOpen(true);
                      }}
                      title="Delete"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this exported {label.toLowerCase()} file from our Amazon S3 storage bucket and permanently wipe the configuration record from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setItemToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && handleDeleteIndividual(itemToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Share External</DialogTitle>
            <DialogDescription>
              {shareDialogLoading ? "Preparing high-quality file..." : `Your ${label.toLowerCase()} is ready to share.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center min-h-[120px] bg-muted/30 rounded-lg border border-dashed my-4">
            {shareDialogLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{isZip ? "Extracting photos..." : "Downloading Video..."}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-full">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-medium">{isZip ? `${shareFiles?.length} Photos` : "Video"} Ready</p>
                <p className="text-xs text-muted-foreground max-w-full px-4 truncate">
                  {isZip ? `${selectedVideo?.id.slice(0, 8)}.zip content` : shareFiles?.[0]?.name}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={() => setShareDialogOpen(false)} disabled={shareDialogLoading}>
              Cancel
            </Button>
            <Button onClick={handleShareConfirm} disabled={shareDialogLoading || !shareFiles || shareFiles.length === 0}>
              Share Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
