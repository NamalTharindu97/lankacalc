"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthDialog } from "@/components/auth-dialog";

export function SavedSignIn() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <section className="saved-page">
      <div className="panel-heading">
        <span>01</span>
        <div><h1>Saved calculations</h1><p>Sign in to see calculations you have saved to your account.</p></div>
      </div>
      <button className="calculate-button" onClick={() => setAuthOpen(true)} type="button">
        Sign in to view saved calculations
      </button>
      <AuthDialog
        onAuthenticated={() => router.refresh()}
        onClose={() => setAuthOpen(false)}
        open={authOpen}
      />
    </section>
  );
}
