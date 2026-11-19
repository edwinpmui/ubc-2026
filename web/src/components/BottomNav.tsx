"use client";

import { House, Link2, Send, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Home", icon: House },
  { href: "/splits", label: "Splits", icon: UsersRound },
  { href: "/pay", label: "Pay", icon: Send, primary: true },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/me", label: "Me", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 mt-auto border-t border-line bg-white/90 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur">
      <ul className="flex items-end justify-between">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          if (primary) {
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-copper text-white shadow-lg shadow-copper/30 transition hover:bg-copper-dark active:scale-95"
                  aria-label={label}
                >
                  <Icon size={22} />
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex w-14 flex-col items-center gap-1 text-[11px] font-medium ${active ? "text-ink" : "text-muted"}`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
