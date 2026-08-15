"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { authClient } from "@/server/auth/client";

type AuthDialogProperties = {
  open: boolean;
  onClose(): void;
  onAuthenticated(): void;
  title?: string;
};

export function AuthDialog({ open, onClose, onAuthenticated, title }: AuthDialogProperties) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function switchMode(next: "sign-in" | "sign-up") {
    setMode(next);
    setError(null);
  }

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(mode === "sign-up"
          ? result.error.message ?? "Could not create the account."
          : result.error.message ?? "Could not sign in.");
        return;
      }

      setPassword("");
      onAuthenticated();
      onClose();
    } catch {
      setError("Could not reach the sign-in service. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <dialog
      aria-label={title ?? "Sign in"}
      className="auth-dialog"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onClose={handleClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) handleClose();
      }}
      ref={dialogRef}
    >
      <div className="auth-dialog-panel">
        <div className="panel-heading">
          <span>{mode === "sign-up" ? "01" : "02"}</span>
          <div>
            <h2>{title ?? (mode === "sign-up" ? "Create an account" : "Sign in")}</h2>
            <p>{mode === "sign-up" ? "Your calculations stay private and yours." : "Access your saved calculations."}</p>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Sign in or create an account">
          <button
            aria-selected={mode === "sign-in"}
            className="auth-tab"
            onClick={() => switchMode("sign-in")}
            role="tab"
            type="button"
          >
            Sign in
          </button>
          <button
            aria-selected={mode === "sign-up"}
            className="auth-tab"
            onClick={() => switchMode("sign-up")}
            role="tab"
            type="button"
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "sign-up" ? (
            <div className="field-group">
              <label htmlFor="auth-name">Name</label>
              <div className="input-shell">
                <input
                  autoComplete="name"
                  id="auth-name"
                  name="name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  type="text"
                  value={name}
                />
              </div>
            </div>
          ) : null}

          <div className="field-group">
            <label htmlFor="auth-email">Email</label>
            <div className="input-shell">
              <input
                autoComplete="email"
                id="auth-email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="auth-password">Password</label>
            <div className="input-shell">
              <input
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                id="auth-password"
                minLength={8}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {mode === "sign-up" ? <p>Use at least 8 characters.</p> : null}
          </div>

          {error ? <div className="form-error" role="alert">{error}</div> : null}

          <button className="calculate-button" disabled={isPending} type="submit">
            {isPending
              ? (mode === "sign-up" ? "Creating account..." : "Signing in...")
              : (mode === "sign-up" ? "Create account" : "Sign in")}
          </button>
        </form>

        <p className="auth-terms">
          No ads, no tracking. Signed-in data is used only to restore your saved calculations.
        </p>
      </div>
    </dialog>
  );
}
