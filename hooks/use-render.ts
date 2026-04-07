"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface RenderResponse {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

interface RenderProps {
  videoSequence?: {
    src: string;
    text: string;
  }[];
  projectId?: string;
  compositionType?: string;
}

export function useRender() {
  return useMutation({
    mutationFn: async (inputProps?: RenderProps) => {
      const endpoint = inputProps?.compositionType === "carousel" 
        ? "/api/carousel" 
        : inputProps?.compositionType === "nicstudy" 
          ? "/api/nicstudy" 
          : "/api/render";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inputProps || {}),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Render failed");
      }
      
      return response.json() as Promise<RenderResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Video rendered successfully!", {
          description: `Filename: ${data.filename}`,
          action: data.url ? {
            label: "Download",
            onClick: () => window.open(data.url, "_blank"),
          } : undefined,
        });
      } else {
        toast.error("Render failed", {
          description: data.error,
        });
      }
    },
    onError: (error: Error) => {
      toast.error("An error occurred during rendering", {
        description: error.message,
      });
    },
  });
}
