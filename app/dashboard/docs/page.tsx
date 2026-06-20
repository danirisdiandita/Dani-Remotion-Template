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
            Fetch renders for a project with pagination.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Endpoint</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>GET /api/projects/{`{projectId}`}/renders</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text="GET /api/projects/{projectId}/renders" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Query Parameters</h3>
            <div className="text-sm space-y-3">
              <div className="flex items-baseline gap-2">
                <code className="text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">page</code>
                <span className="text-xs text-muted-foreground">optional · default <code className="text-xs bg-muted px-1 py-0.5 rounded">1</code></span>
              </div>
              <div className="flex items-baseline gap-2">
                <code className="text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">pageSize</code>
                <span className="text-xs text-muted-foreground">optional · default <code className="text-xs bg-muted px-1 py-0.5 rounded">5</code> · max <code className="text-xs bg-muted px-1 py-0.5 rounded">100</code></span>
              </div>
              <div className="flex items-baseline gap-2">
                <code className="text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">presigned</code>
                <span className="text-xs text-muted-foreground">optional · default <code className="text-xs bg-muted px-1 py-0.5 rounded">false</code></span>
              </div>
              <p className="text-xs text-muted-foreground">
                When <code className="text-xs bg-muted px-1 py-0.5 rounded">presigned=true</code>, each render gets an <code className="text-xs bg-muted px-1 py-0.5 rounded">s3Url</code> field with a presigned download URL.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Response</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{`{
  "renders": [
    {
      "id": "cmnx5cezc0001qzfzy0xponzc",
      "status": "completed",
      "s3Key": "renders/.../file.mp4",
      "s3Url": "https://...",       // only if ?presigned=true
      "caption": "...",
      "checklisted": false,
      "createdAt": "2026-04-13T12:06:05.016Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 5,
    "totalCount": 42,
    "totalPages": 9
  }
}`}</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={JSON.stringify({renders:[{id:"cmnx5cezc0001qzfzy0xponzc",status:"completed",s3Key:"renders/.../file.mp4",s3Url:"https://...",caption:"...",checklisted:false,createdAt:"2026-04-13T12:06:05.016Z"}],pagination:{page:1,pageSize:5,totalCount:42,totalPages:9}}, null, 2)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">cURL Examples</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Default (page 1, 5 per page)</p>
                <div className="relative">
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{`curl -H "x-api-key: ve_your_api_key_here" \\
  https://video-templater.up.railway.app/api/projects/{projectId}/renders`}</code></pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={`curl -H "x-api-key: ve_your_api_key_here" \\\n  https://video-templater.up.railway.app/api/projects/{projectId}/renders`} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">With presigned URLs + custom page</p>
                <div className="relative">
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{`curl -H "x-api-key: ve_your_api_key_here" \\
  "https://video-templater.up.railway.app/api/projects/{projectId}/renders?page=2&pageSize=10&presigned=true"`}</code></pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={`curl -H "x-api-key: ve_your_api_key_here" \\\n  "https://video-templater.up.railway.app/api/projects/{projectId}/renders?page=2&pageSize=10&presigned=true"`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Delete Render
            <Badge variant="destructive">DELETE</Badge>
          </CardTitle>
          <CardDescription>
            Delete a render video by ID. Removes the file from S3 and the database record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Endpoint</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>DELETE /api/renders/{`{renderId}`}</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text="DELETE /api/renders/{renderId}" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">cURL Example</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{`curl -X DELETE \\
  -H "x-api-key: ve_your_api_key_here" \\
  https://video-templater.up.railway.app/api/renders/cmnx5cezc0001qzfzy0xponzc`}</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={`curl -X DELETE \\\n  -H "x-api-key: ve_your_api_key_here" \\\n  https://video-templater.up.railway.app/api/renders/cmnx5cezc0001qzfzy0xponzc`} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Response</h3>
            <div className="relative">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto pr-10"><code>{`{ "success": true }`}</code></pre>
              <div className="absolute top-2 right-2">
                <CopyButton text='{ "success": true }' />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
