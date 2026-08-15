"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthDialog } from "@/components/auth-dialog";
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
      <div className="account-menu">
        <Link className="account-link" href="/saved">
          Saved
        </Link>
        <span className="account-name">{user.name}</span>
        <button className="text-button" onClick={handleSignOut} type="button">
          Sign out
        </button>
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
      <button className="text-button sign-in-button" onClick={() => setDialogOpen(true)} type="button">
        Sign in
      </button>
      <AuthDialog
        onAuthenticated={() => router.refresh()}
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
      />
    </>
  );
}
