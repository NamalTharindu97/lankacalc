"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";

import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/auth/client";

type AccountControlsProperties = {
  initialUser: { name: string; email: string } | null;
};

export function AccountControls({ initialUser }: AccountControlsProperties) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const user = session?.user ?? initialUser;

  async function handleSignOut() {
    await authClient.signOut();
    router.refresh();
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block" href="/saved">
          Saved
        </Link>
        <Link className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block" href="/reminders">
          Reminders
        </Link>
        <Button onClick={handleSignOut} size="sm" variant="ghost">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
        <AuthDialog
          onAuthenticated={() => router.refresh()}
          onClose={() => setDialogOpen(false)}
          open={dialogOpen}
        />
      </div>
    );
  }

  return (
    <>
      <Button onClick={() => setDialogOpen(true)} size="sm" variant="outline">
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
      <AuthDialog
        onAuthenticated={() => router.refresh()}
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
      />
    </>
  );
}
