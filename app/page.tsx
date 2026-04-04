"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Download, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [isRendering, setIsRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRender = async () => {
    setIsRendering(true);
    setError(null);
    setRenderUrl(null);

    try {
      const response = await fetch("/api/render", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setRenderUrl(data.url);
      } else {
        setError(data.error || "Failed to render video");
      }
    } catch (err) {
      setError("An unexpected error occurred during rendering.");
      console.error(err);
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (!renderUrl) return;
    const link = document.createElement("a");
    link.href = renderUrl;
    link.download = `Dani-Production-${new Date().getTime()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Production <span className="text-blue-600">Engine</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Generate your 13.5s marketing sequence with a single click.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 text-left">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        )}

        {renderUrl && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-600 text-left">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-semibold italic">Your composition is baked and ready! Click below to download.</p>
          </div>
        )}

        <div className="pt-4">
          {!renderUrl ? (
            <Button
              className="w-full h-16 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800"
              disabled={isRendering}
              onClick={startRender}
            >
              {isRendering ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Rendering Sequence...
                </>
              ) : (
                <>
                  <PlayIcon className="mr-3 h-5 w-5 fill-current" />
                  Generate Video
                </>
              )}
            </Button>
          ) : (
            <Button
              className="w-full h-16 text-lg font-bold rounded-2xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30 transition-all active:scale-95"
              onClick={handleDownload}
            >
              <Download className="mr-3 h-5 w-5" />
              Download MP4
            </Button>
          )}
        </div>

        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-8">
          Notespark Video Engine &bull; 2026
        </p>
      </div>
    </main>
  );
}

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
