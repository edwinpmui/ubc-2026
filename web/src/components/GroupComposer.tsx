"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";
import type { PublicUser } from "@/lib/types";
import { Avatar } from "./Avatar";
import { UserPicker } from "./UserPicker";

export function GroupComposer({ me }: { me: PublicUser }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setPending(true);
    setError("");
    try {
      const group = await postJson<{ id: string }>("/api/groups", { name, handles: friends.map((f) => f.handle) });
      router.push(`/splits/groups/${group.id}`);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      <div>
        <label className="label" htmlFor="group-name">Group name</label>
        <input
          id="group-name"
          className="input"
          placeholder="Whistler trip 🏔️"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <span className="label">Who&apos;s in?</span>
        <UserPicker
          onSelect={(user) => user && setFriends((list) => [...list, user])}
          exclude={friends.map((f) => f.id)}
          placeholder="Add friends"
        />
        <ul className="mt-3 flex flex-col divide-y divide-line rounded-2xl border border-line">
          <li className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={me.name} seed={me.handle} size={34} />
            <span className="flex-1 text-sm font-medium">You</span>
          </li>
          {friends.map((friend) => (
            <li key={friend.id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={friend.name} seed={friend.handle} size={34} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{friend.name}</span>
              <button
                type="button"
                className="rounded-full p-1 text-muted hover:bg-cream"
                aria-label={`Remove ${friend.name}`}
                onClick={() => setFriends((list) => list.filter((f) => f.id !== friend.id))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">You can add more people later. Anyone in the group can log expenses.</p>
      </div>

      {error && <p className="rounded-2xl bg-rose-soft px-4 py-3 text-sm text-rose">{error}</p>}

      <button className="btn-primary !py-3.5" disabled={!name.trim() || friends.length === 0 || pending} onClick={create}>
        {pending && <Loader2 size={16} className="animate-spin" />}
        {pending ? "Creating group…" : `Create group with ${friends.length + 1} people`}
      </button>
    </div>
  );
}
