import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useCompositionTexts(compositionId: string) {
  return useQuery({
    queryKey: ["compositions", compositionId, "texts"],
    queryFn: async () => {
      const res = await fetch(`/api/compositions/${compositionId}/texts`);
      if (!res.ok) throw new Error("Failed to fetch overlay texts");
      return res.json();
    },
    enabled: !!compositionId,
  });
}

export function useAddCompositionText(compositionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { text: string; startTime?: number; endTime?: number; positionX?: number; positionY?: number; style?: any }) => {
      const res = await fetch(`/api/compositions/${compositionId}/texts`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to add text");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compositions", compositionId, "texts"] });
      toast.success("Text overlay added");
    },
  });
}

export function useUpdateCompositionText(compositionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; text?: string; startTime?: number; endTime?: number; positionX?: number; positionY?: number; style?: any }) => {
      const res = await fetch(`/api/compositions/texts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update text");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compositions", compositionId, "texts"] });
    },
  });
}

export function useDeleteCompositionText(compositionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/compositions/texts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete text");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compositions", compositionId, "texts"] });
      toast.success("Text overlay deleted");
    },
  });
}
