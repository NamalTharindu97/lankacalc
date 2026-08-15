"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthDialog } from "@/components/auth-dialog";

export function RemindersSignIn() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <section className="saved-page">
      <div className="panel-heading">
        <span>01</span>
        <div><h1>Reminders</h1><p>Sign in to create date-based email reminders.</p></div>
      </div>
      <button className="calculate-button" onClick={() => setAuthOpen(true)} type="button">
        Sign in to manage reminders
      </button>
      <AuthDialog
        onAuthenticated={() => router.refresh()}
        onClose={() => setAuthOpen(false)}
        open={authOpen}
      />
    </section>
  );
}
