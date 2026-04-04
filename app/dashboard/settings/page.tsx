"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account preferences and view your profile information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">Settings implementation coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
