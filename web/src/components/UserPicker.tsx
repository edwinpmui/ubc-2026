"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getJson } from "@/lib/client";
import type { PublicUser } from "@/lib/types";
import { Avatar } from "./Avatar";

export function UserPicker({
  selected,
  onSelect,
  exclude = [],
  placeholder = "Name or @handle",
}: {
  selected?: PublicUser | null;
  onSelect: (user: PublicUser | null) => void;
  exclude?: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (selected) return;
    const timer = setTimeout(() => {
      getJson<PublicUser[]>(`/api/users?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 150);
    return () => clearTimeout(timer);
  }, [query, selected]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-cream/60 px-3 py-2.5">
        <Avatar name={selected.name} seed={selected.handle} size={36} />
        <div className="flex-1">
          <p className="text-sm font-semibold">{selected.name}</p>
          <p className="text-xs text-muted">@{selected.handle}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-full p-1.5 text-muted hover:bg-white"
          aria-label="Change"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  const visible = results.filter((u) => !exclude.includes(u.id));

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        className="input !pl-10"
        placeholder={placeholder}
        autoCapitalize="none"
      />
      {focused && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-xl">
          {visible.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">No one found yet</li>}
          {visible.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(user);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-cream"
              >
                <Avatar name={user.name} seed={user.handle} size={34} />
                <span>
                  <span className="block text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted">@{user.handle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
