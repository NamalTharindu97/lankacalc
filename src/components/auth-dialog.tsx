"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      className="z-50 rounded-xl border bg-background p-0 shadow-lg backdrop:bg-black/50"
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
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>{title ?? (mode === "sign-up" ? "Create an account" : "Sign in")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "sign-up" ? "Your calculations stay private and yours." : "Access your saved calculations."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-2">
            <Button
              onClick={() => switchMode("sign-in")}
              size="sm"
              variant={mode === "sign-in" ? "default" : "ghost"}
            >
              Sign in
            </Button>
            <Button
              onClick={() => switchMode("sign-up")}
              size="sm"
              variant={mode === "sign-up" ? "default" : "ghost"}
            >
              Create account
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Name</Label>
                <Input
                  autoComplete="name"
                  id="auth-name"
                  name="name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  type="text"
                  value={name}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                autoComplete="email"
                id="auth-email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                id="auth-password"
                minLength={8}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              {mode === "sign-up" ? (
                <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              ) : null}
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "sign-up" ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                mode === "sign-up" ? "Create account" : "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            No ads, no tracking. Signed-in data is used only to restore your saved calculations.
          </p>
        </CardContent>
      </Card>
    </dialog>
  );
}
