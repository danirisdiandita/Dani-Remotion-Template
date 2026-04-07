"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useUploadAsset } from "@/hooks/use-assets";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NicStudyEditorProps {
  projectId: string;
  onPropsChange: (props: NicStudyProps) => void;
  value: NicStudyProps;
}

export interface NicStudyProps {
  title: string;
  description: string;
  tipsTitle: string;
  tips: string[];
  handle: string;
  titleImage?: string;
  tipsImage?: string;
  ctaImage?: string;
}

const SLIDE_LABELS = [
  { key: "titleImage" as const, label: "Slide 1 — Title", desc: "Background for title & description slide" },
  { key: "tipsImage" as const, label: "Slide 2 — Tips", desc: "Background for tips/bullet points slide" },
  { key: "ctaImage" as const, label: "Slide 3 — CTA", desc: "Background for NoteSpark CTA slide" },
];

function ImageUploadSlot({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value?: string;
  onChange: (s3Key: string | undefined) => void;
}) {
  const { mutateAsync: uploadAsset, isPending } = useUploadAsset();

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const asset = await uploadAsset({ file });
      onChange(asset.s3Key);
      toast.success(`Uploaded ${file.name}`);
    } catch {
      toast.error("Upload failed");
    }
  }, [uploadAsset, onChange]);

  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          <div
            className={cn(
              "relative size-20 rounded-lg border-2 border-dashed flex items-center justify-center shrink-0 overflow-hidden transition-all",
              value ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/30"
            )}
          >
            {isPending ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : value ? (
              <>
                <ImageIcon className="size-6 text-primary/60" />
                <button
                  onClick={() => onChange(undefined)}
                  className="absolute top-0.5 right-0.5 size-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80"
                >
                  <X className="size-3" />
                </button>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-1">
                <Upload className="size-5 text-muted-foreground/50" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{label}</p>
            <p className="text-[11px] text-muted-foreground">{desc}</p>
            {value && (
              <p className="text-[10px] text-primary font-mono mt-1 truncate">
                ✓ {value}
              </p>
            )}
            {!value && !isPending && (
              <label className="cursor-pointer">
                <div className="inline-flex items-center justify-center mt-2 h-7 px-3 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Upload className="size-3 mr-1.5" />
                  Upload Image
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NicStudyEditor({ projectId, onPropsChange, value }: NicStudyEditorProps) {
  const [tipsText, setTipsText] = useState(value.tips.join("\n"));

  const update = (patch: Partial<NicStudyProps>) => {
    onPropsChange({ ...value, ...patch });
  };

  const handleTipsChange = (raw: string) => {
    setTipsText(raw);
    const tips = raw.split("\n").map(l => l.trim()).filter(Boolean);
    update({ tips });
  };

  return (
    <div className="space-y-6">
      {/* Text Props Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Content</h3>
        
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nic-title" className="text-xs">Title</Label>
            <Input
              id="nic-title"
              value={value.title}
              onChange={e => update({ title: e.target.value })}
              placeholder="Hari 1: Penalaran Umum (PU)"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nic-handle" className="text-xs">Handle / Watermark</Label>
            <Input
              id="nic-handle"
              value={value.handle}
              onChange={e => update({ handle: e.target.value })}
              placeholder="@nicstudy.id"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="nic-description" className="text-xs">Description</Label>
          <Input
            id="nic-description"
            value={value.description}
            onChange={e => update({ description: e.target.value })}
            placeholder="Fokus: Mengolah informasi secara logis..."
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="nic-tips-title" className="text-xs">Tips Section Title</Label>
          <Input
            id="nic-tips-title"
            value={value.tipsTitle}
            onChange={e => update({ tipsTitle: e.target.value })}
            placeholder="Materi Wajib"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="nic-tips" className="text-xs">
            Bullet Points <span className="text-muted-foreground font-normal">(one per line)</span>
          </Label>
          <Textarea
            id="nic-tips"
            value={tipsText}
            onChange={e => handleTipsChange(e.target.value)}
            placeholder={"Logika (Ponens, Tollens, dan Silogisme)\nMemperkuat dan Memperlemah Pernyataan\n..."}
            className="min-h-[140px]"
          />
          <p className="text-[10px] text-muted-foreground">
            {value.tips.length} bullet point{value.tips.length !== 1 ? "s" : ""} detected
          </p>
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Background Images <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
        </h3>
        <div className="grid gap-3">
          {SLIDE_LABELS.map(slide => (
            <ImageUploadSlot
              key={slide.key}
              label={slide.label}
              desc={slide.desc}
              value={value[slide.key]}
              onChange={(s3Key) => update({ [slide.key]: s3Key })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
