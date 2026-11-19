"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await postJson("/api/auth/logout");
    router.push("/");
    router.refresh();
  }

  return (
    <button className="btn-ghost w-full" onClick={logout}>
      <LogOut size={16} /> Sign out
    </button>
  );
}
