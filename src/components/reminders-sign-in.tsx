"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RemindersSignIn() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reminders</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to create date-based email reminders.</p>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setAuthOpen(true)}>Sign in to manage reminders</Button>
          <AuthDialog
            onAuthenticated={() => router.refresh()}
            onClose={() => setAuthOpen(false)}
            open={authOpen}
          />
        </CardContent>
      </Card>
    </div>
  );
}
