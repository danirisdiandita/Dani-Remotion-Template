import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useCompositionAssets(compositionId: string) {
  return useQuery({
    queryKey: ["compositions", compositionId, "assets"],
    queryFn: async () => {
      const res = await fetch(`/api/compositions/${compositionId}/assets`);
      if (!res.ok) throw new Error("Failed to fetch composition assets");
      return res.json();
    },
    enabled: !!compositionId,
  });
}

export function useAddCompositionAsset(compositionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { assetId: string; text?: string; order?: number }) => {
      const res = await fetch(`/api/compositions/${compositionId}/assets`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to link asset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compositions", compositionId, "assets"] });
      toast.success("Asset added to timeline");
    },
  });
}

export function useDeleteCompositionAsset(compositionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/compositions/assets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove asset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compositions", compositionId, "assets"] });
      toast.success("Asset removed from timeline");
    },
  });
}
