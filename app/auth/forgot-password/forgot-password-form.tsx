"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });

      if (error) {
        toast.error(error.message || "Failed to send reset email");
      } else {
        setSent(true);
        toast.success("Check your email for the reset link");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password</CardTitle>
          <CardDescription>
            {sent
              ? "Reset link sent! Check your inbox."
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        {sent ? (
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-slate-500">
              If an account with that email exists, you&apos;ll receive a password reset link shortly.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-center text-sm text-slate-500">
                <Link href="/auth/sign-in" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  <ArrowLeft className="h-3 w-3" />
                  Back to Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
