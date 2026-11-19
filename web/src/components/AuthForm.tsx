"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { postJson } from "@/lib/client";

export function AuthForm({
  mode: initialMode,
  onDone,
}: {
  mode: "signup" | "login";
  onDone: () => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const signingUp = mode === "signup";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await postJson(`/api/auth/${mode}`, Object.fromEntries(new FormData(event.currentTarget)));
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {signingUp && (
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" className="input" placeholder="Alex Chen" autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="handle">Handle</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
          <input
            id="handle"
            name="handle"
            className="input !pl-9"
            placeholder="alexchen"
            autoCapitalize="none"
            autoComplete="username"
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          placeholder={signingUp ? "At least 8 characters" : "••••••••"}
          autoComplete={signingUp ? "new-password" : "current-password"}
          required
        />
      </div>

      {error && <p className="rounded-2xl bg-rose-soft px-4 py-3 text-sm text-rose">{error}</p>}

      <button className="btn-primary mt-2 w-full !py-3.5" disabled={pending}>
        {pending && <Loader2 size={16} className="animate-spin" />}
        {pending ? (signingUp ? "Creating your wallet…" : "Signing in…") : signingUp ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        {signingUp ? "Already have an account?" : "New to Penny?"}{" "}
        <button
          type="button"
          className="font-semibold text-copper hover:underline"
          onClick={() => {
            setMode(signingUp ? "login" : "signup");
            setError("");
          }}
        >
          {signingUp ? "Sign in" : "Create one"}
        </button>
      </p>
    </form>
  );
}
