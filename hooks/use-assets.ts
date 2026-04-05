import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, name, description }: { file: File; name?: string; description?: string }) => {
      // 1. Get presigned URL
      const presignedRes = await fetch(`/api/assets/presigned?filename=${encodeURIComponent(file.name)}`);
      if (!presignedRes.ok) throw new Error("Failed to get upload URL");
      const { presignedUrl, filename } = await presignedRes.json();

      // 2. Upload to S3 directly
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload to storage");

      // 3. Save metadata to DB
      const assetRes = await fetch("/api/assets", {
        method: "POST",
        body: JSON.stringify({
          name: name || file.name,
          s3Key: filename,
          type: file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "audio",
          description,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!assetRes.ok) throw new Error("Failed to save asset metadata");

      return assetRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Asset uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
