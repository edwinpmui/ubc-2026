import { ArrowRight, Check, Link2, Send, UsersRound, X, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, PennyMark } from "@/components/Avatar";
import { currentUser } from "@/lib/session";

const comparison = [
  { label: "Money is actually yours", penny: "~1 second", venmo: "1–3 business days to bank" },
  { label: "Instant access fee", penny: "~1¢ network fee", venmo: "1.75% (up to $25)" },
  { label: "Pay someone not on the app", penny: true, venmo: false },
  { label: "Works across borders", penny: true, venmo: false },
];

const features = [
  {
    icon: Send,
    title: "Pay & request",
    body: "Find a friend by @handle, add a note, done. Requests show up on their home screen with one-tap pay.",
  },
  {
    icon: Link2,
    title: "Pay links",
    body: "Text money to anyone, even without the app. They claim it free; if they don't, it comes back in 7 days.",
  },
  {
    icon: UsersRound,
    title: "Splits that settle",
    body: "Split dinner evenly or by item. Everyone pays their share and you watch the bill fill up in real time.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={18} className="text-mint" />;
  if (value === false) return <X size={18} className="text-muted/60" />;
  return <span>{value}</span>;
}

export default async function Landing() {
  if (await currentUser()) redirect("/home");

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16">
      <nav className="flex items-center justify-between py-6">
        <span className="flex items-center gap-2 text-lg font-semibold">
          <PennyMark size={34} /> Penny
        </span>
        <div className="flex gap-2">
          <Link href="/login" className="btn-ghost !py-2">Sign in</Link>
          <Link href="/signup" className="btn-dark !py-2">Get started</Link>
        </div>
      </nav>

      <section className="grid items-center gap-12 py-12 md:grid-cols-[1.15fr_1fr] md:py-20">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-copper-soft px-3 py-1 text-xs font-semibold text-copper-dark">
            <Zap size={13} /> Sub-second settlement · fees under a penny
          </span>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Money between friends,
            <br />
            <span className="text-copper">settled in a second.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Pay, request and split with anyone. Every payment is final the moment you tap Pay, and costs about a cent.
            No 1.75% instant-transfer fee. No waiting 1–3 business days.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary !px-6 !py-3.5 text-base">
              Create a free account <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-ghost !px-6 !py-3.5 text-base">I have an account</Link>
          </div>
          <p className="mt-4 text-sm text-muted">No bank details, seed phrases or gas tokens. Just a handle and a password.</p>
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-rise [animation-delay:120ms]">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-copper-soft via-cream to-mint-soft blur-2xl" />
          <div className="card overflow-hidden shadow-[0_30px_80px_-30px_rgba(60,35,15,0.35)]">
            <div className="bg-ink px-6 py-6 text-white">
              <p className="text-xs uppercase tracking-wider text-white/60">You paid Maya</p>
              <p className="mt-1 text-5xl font-semibold tabular-nums">$42.00</p>
              <p className="mt-2 text-white/70">🍣 Sushi night</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
              <div className="p-4">
                <p className="text-xs text-muted">Settled in</p>
                <p className="text-xl font-semibold text-mint">0.48s</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted">Network fee</p>
                <p className="text-xl font-semibold">$0.0094</p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              {[
                ["Jordan Lee", "jordan", "+$18.50", "🚕 Airport ride"],
                ["Priya Shah", "priya", "+$12.00", "☕ Coffee run"],
              ].map(([name, handle, amount, memo]) => (
                <div key={handle} className="flex items-center gap-3">
                  <Avatar name={name} seed={handle} size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{name} paid you</p>
                    <p className="text-xs text-muted">{memo}</p>
                  </div>
                  <span className="text-sm font-semibold text-mint">{amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-copper-soft text-copper">
              <Icon size={20} />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-3xl font-semibold tracking-tight">Same habit. Better plumbing.</h2>
        <p className="mt-2 text-muted">Penny feels like the apps you already use, but the money moves on a faster rail.</p>
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="p-4 font-medium" />
                <th className="p-4 font-semibold text-copper">Penny</th>
                <th className="p-4 font-medium">Venmo</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <td className="p-4 font-medium">{row.label}</td>
                  <td className="p-4"><Cell value={row.penny} /></td>
                  <td className="p-4 text-muted"><Cell value={row.venmo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-16 flex flex-col items-center gap-2 text-center text-sm text-muted">
        <PennyMark size={28} />
        <p>Payments settle in USDC on Arc, a stablecoin-native network where fees are paid in dollars, not volatile tokens.</p>
      </footer>
    </main>
  );
}
