import { useQuery } from "@tanstack/react-query";

export function useProjectRenders(projectId: string, page = 1, pageSize = 5) {
  return useQuery({
    queryKey: ["projects", projectId, "renders", page, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/renders?page=${page}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error("Failed to fetch renders");
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useRenderDownloadUrl(renderId: string) {
  return useQuery({
    queryKey: ["renders", renderId, "download-url"],
    queryFn: async () => {
      const res = await fetch(`/api/renders/${renderId}/url`);
      if (!res.ok) throw new Error("Failed to fetch download URL");
      return res.json();
    },
    enabled: false, // Only trigger manually or on click
  });
}
