import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <BookOpen className="size-6" />
        <h1 className="text-2xl font-bold">API Documentation</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Authentication
            <Badge variant="secondary">API Key</Badge>
          </CardTitle>
          <CardDescription>
            Generate an API key from the{" "}
            <a href="/dashboard/api-key" className="font-semibold text-primary hover:underline">API Key</a>{" "}
            page, then pass it in the <code className="text-xs bg-muted px-1 py-0.5 rounded">x-api-key</code> header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Header</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{'x-api-key: ve_your_api_key_here'}</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text="x-api-key: ve_your_api_key_here" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Alternative (Bearer token)</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{'Authorization: Bearer ve_your_api_key_here'}</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text="Authorization: Bearer ve_your_api_key_here" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            List Renders
            <Badge>GET</Badge>
          </CardTitle>
          <CardDescription>
            Fetch all renders for a project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Endpoint</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>GET /api/projects/{`{projectId}`}/renders</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={`GET /api/projects/{projectId}/renders`} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Headers</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{'x-api-key: ve_your_api_key_here'}</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text="x-api-key: ve_your_api_key_here" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">cURL Example</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{`curl -H "x-api-key: ve_your_api_key_here" \\
  https://video-templater.up.railway.app/api/projects/cmnuxllk5000021nqs85csz1f/renders`}</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={`curl -H "x-api-key: ve_your_api_key_here" \\\n  https://video-templater.up.railway.app/api/projects/cmnuxllk5000021nqs85csz1f/renders`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
