"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Key,
  Copy,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type ApiKey = {
  id: string;
  name: string | null;
  key: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export default function ApiKeyPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [showGenerate, setShowGenerate] = useState(false);

  const fetchKeys = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/key?page=${page}&pageSize=10`);
      if (!res.ok) throw new Error("Failed to fetch keys");
      const data = await res.json();
      setKeys(data.keys);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setNewKeyName("");
      setShowGenerate(false);
      toast.success("API key generated");
      fetchKeys(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async (id: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`/api/key?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      toast.success("API key revoked");
      fetchKeys(pagination?.page || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => {
    const prefix = key.slice(0, 6);
    const suffix = key.slice(-4);
    return `${prefix}${"•".repeat(Math.max(8, key.length - 10))}${suffix}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <Button onClick={() => setShowGenerate(!showGenerate)}>
          <Plus className="size-4 mr-2" />
          Generate Key
        </Button>
      </div>

      {showGenerate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generate New API Key</CardTitle>
            <CardDescription>
              Optionally give your key a name to identify it later.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="keyName">Key name (optional)</Label>
              <Input
                id="keyName"
                placeholder="e.g. Production, CI/CD, Testing"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateKey()}
              />
            </div>
            <Button onClick={generateKey} disabled={generating}>
              {generating && <Loader2 className="size-4 animate-spin mr-2" />}
              Generate
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            Your API Keys
          </CardTitle>
          <CardDescription>
            Manage API keys for programmatic access. Use an API key in the{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">x-api-key</code>{" "}
            header when calling endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No API keys yet.</p>
              <p className="text-xs mt-1">Generate one to get started.</p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {keys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        {apiKey.name && (
                          <Badge variant="secondary" className="text-xs">
                            {apiKey.name}
                          </Badge>
                        )}
                        <code className="text-sm font-mono text-muted-foreground truncate">
                          {revealedKeys.has(apiKey.id)
                            ? apiKey.key
                            : maskKey(apiKey.key)}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created{" "}
                        {new Date(apiKey.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {apiKey.lastUsedAt && (
                          <>
                            {" "}
                            · Last used{" "}
                            {new Date(apiKey.lastUsedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleReveal(apiKey.id)}
                        title={revealedKeys.has(apiKey.id) ? "Hide key" : "Show key"}
                      >
                        <Key className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyKey(apiKey.key)}
                        title="Copy to clipboard"
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revokeKey(apiKey.id)}
                        disabled={revoking === apiKey.id}
                        className="text-destructive hover:text-destructive"
                        title="Revoke key"
                      >
                        {revoking === apiKey.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} keys)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchKeys(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchKeys(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
