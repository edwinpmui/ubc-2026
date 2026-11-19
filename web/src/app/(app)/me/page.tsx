import { ExternalLink, Fuel, Globe, KeyRound } from "lucide-react";
import { headers } from "next/headers";
import { Avatar } from "@/components/Avatar";
import { CopyButton } from "@/components/CopyButton";
import { LogoutButton } from "@/components/LogoutButton";
import { PageHeader } from "@/components/PageHeader";
import { QrCode } from "@/components/QrCode";
import { addressUrl, isArc, networkName } from "@/lib/config";
import { formatFee, formatUsd, shortAddress } from "@/lib/format";
import { safeBalance, statsFor } from "@/lib/services";
import { requirePageUser } from "@/lib/session";

export default async function MePage() {
  const user = await requirePageUser();
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const payMeUrl = `${protocol}://${requestHeaders.get("host")}/pay?to=${user.handle}`;
  const balance = await safeBalance(user.address);
  const stats = statsFor(user);
  const explorer = addressUrl(user.address);

  return (
    <>
      <PageHeader title="Me" />
      <div className="flex flex-col gap-5 px-5 pb-8">
        <section className="card flex flex-col items-center gap-3 p-6 text-center">
          <Avatar name={user.name} seed={user.handle} size={64} />
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted">@{user.handle}</p>
          </div>
          <QrCode value={payMeUrl} size={180} />
          <p className="text-sm text-muted">Friends scan this to pay you</p>
          <CopyButton value={payMeUrl} label="Copy pay-me link" />
        </section>

        <section className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-cream p-3">
            <p className="text-[11px] text-muted">Balance</p>
            <p className="font-semibold tabular-nums">{balance === null ? "—" : formatUsd(balance)}</p>
          </div>
          <div className="rounded-2xl bg-cream p-3">
            <p className="text-[11px] text-muted">Fees paid</p>
            <p className="font-semibold tabular-nums">{formatFee(stats.feesPaid)}</p>
          </div>
          <div className="rounded-2xl bg-cream p-3">
            <p className="text-[11px] text-muted">Fees skipped</p>
            <p className="font-semibold tabular-nums text-mint">{formatUsd(stats.feesAvoided)}</p>
          </div>
        </section>

        <section className="card divide-y divide-line text-sm">
          <div className="flex items-start gap-3 p-4">
            <KeyRound size={18} className="mt-0.5 shrink-0 text-copper" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Your wallet</p>
              <p className="text-xs text-muted">Created for you at sign-up. No seed phrase to lose.</p>
              <p className="mt-1 font-mono text-xs">{shortAddress(user.address)}</p>
            </div>
            <CopyButton value={user.address} label="Copy" />
          </div>
          <div className="flex items-start gap-3 p-4">
            <Fuel size={18} className="mt-0.5 shrink-0 text-copper" />
            <div>
              <p className="font-medium">Fees in dollars</p>
              <p className="text-xs text-muted">
                Network fees are paid straight from your USDC balance, usually around a cent. No second token to buy.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4">
            <Globe size={18} className="mt-0.5 shrink-0 text-copper" />
            <div className="flex-1">
              <p className="font-medium">Network</p>
              <p className="text-xs text-muted">{networkName}</p>
              {explorer && (
                <a href={explorer} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-copper">
                  View wallet on explorer <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
          {isArc && (
            <div className="p-4">
              <p className="font-medium">Add test funds</p>
              <p className="text-xs text-muted">
                Copy your wallet address and grab free testnet USDC from the Circle faucet.
              </p>
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="btn-ghost mt-3 w-full !py-2">
                Open Circle faucet <ExternalLink size={14} />
              </a>
            </div>
          )}
        </section>

        <LogoutButton />
      </div>
    </>
  );
}
