"use client";

import { useRender } from "@/hooks/use-render";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Video, Download } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { isPending, mutate: startRender, data } = useRender();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.push("/auth/sign-in");
    }
  }, [session, isSessionPending, router]);

  if (isSessionPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Studio</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col overflow-hidden">
          <div className="aspect-video bg-muted flex items-center justify-center relative">
            <Video className="size-12 text-muted-foreground/50" />
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
              Template: Dani
            </div>
          </div>
          <CardHeader>
            <CardTitle>Dani Composition</CardTitle>
            <CardDescription>
              Render the current marketing video template with production assets.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button 
              className="w-full" 
              onClick={() => startRender()} 
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Start Rendering
                </>
              )}
            </Button>

            {data?.success && data.url && (
              <a 
                href={data.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline" }), "w-full mt-2")}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Latest
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
