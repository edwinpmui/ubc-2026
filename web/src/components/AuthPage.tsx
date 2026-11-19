"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "./AuthForm";
import { PennyMark } from "./Avatar";

export function AuthPage({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-12">
      <Link href="/" className="mb-10 flex items-center gap-2 font-semibold">
        <PennyMark size={32} /> Penny
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {mode === "signup" ? "Get paid in a second." : "Welcome back."}
      </h1>
      <p className="mb-8 mt-2 text-muted">
        {mode === "signup"
          ? "Pick a handle and a password. We set up your wallet behind the scenes — no seed phrase, no gas tokens."
          : "Sign in with your handle."}
      </p>
      <AuthForm
        mode={mode}
        onDone={() => {
          router.push("/home");
          router.refresh();
        }}
      />
    </div>
  );
}
