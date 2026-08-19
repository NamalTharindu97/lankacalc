"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SavedSignIn() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Saved calculations</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to see calculations you have saved to your account.</p>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setAuthOpen(true)}>Sign in to view saved calculations</Button>
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
