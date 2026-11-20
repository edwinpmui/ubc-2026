"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";
import type { PublicUser } from "@/lib/types";
import { UserPicker } from "./UserPicker";

export function AddMember({ groupId, memberIds }: { groupId: string; memberIds: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function add(user: PublicUser | null) {
    if (!user) return;
    setError("");
    try {
      await postJson(`/api/groups/${groupId}/members`, { handle: user.handle });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <UserPicker onSelect={add} exclude={memberIds} placeholder="Add someone to the group" />
      {error && <p className="mt-2 text-xs text-rose">{error}</p>}
    </div>
  );
}
