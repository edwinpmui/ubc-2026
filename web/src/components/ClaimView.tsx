"use client";

import { Gift, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { encodeAbiParameters, isHex, keccak256, parseAbiParameters, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getJson, postJson } from "@/lib/client";
import { formatUsd } from "@/lib/format";
import { AuthForm } from "./AuthForm";
import { Avatar } from "./Avatar";

interface LinkInfo {
  claimAddress: Address;
  amount: string;
  memo: string;
  status: "open" | "claimed" | "cancelled" | "expired";
  sender: { name: string; handle: string } | null;
  chainId: number;
  contract: Address;
  viewer: { address: Address; name: string; isSender: boolean } | null;
}

const closedMessages = {
  claimed: "This link has already been claimed.",
  cancelled: "The sender cancelled this link.",
  expired: "This link expired and the money went back to the sender.",
};

export function ClaimView() {
  const router = useRouter();
  const [key, setKey] = useState<Hex | null>(null);
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async (claimKey: Hex) => {
    try {
      setInfo(await getJson<LinkInfo>(`/api/links/${privateKeyToAccount(claimKey).address}`));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (!isHex(fragment) || fragment.length !== 66) {
      setError("This pay link looks incomplete. Ask the sender to share it again.");
      return;
    }
    setKey(fragment);
    load(fragment);
  }, [load]);

  async function claim() {
    if (!key || !info?.viewer) return;
    setPending(true);
    setError("");
    try {
      const digest = keccak256(
        encodeAbiParameters(parseAbiParameters("uint256, address, address, address"), [
          BigInt(info.chainId),
          info.contract,
          info.claimAddress,
          info.viewer.address,
        ]),
      );
      const signature = await privateKeyToAccount(key).signMessage({ message: { raw: digest } });
      const activity = await postJson<{ id: string }>(`/api/links/${info.claimAddress}/claim`, { signature });
      router.push(`/receipt/${activity.id}`);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  if (!info) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        {error ? <p className="text-muted">{error}</p> : <Loader2 className="animate-spin text-copper" />}
        <Link href="/" className="text-sm font-semibold text-copper">Go to Penny</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-gradient-to-b from-copper-soft to-white px-6 pb-8 pt-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-copper shadow-sm animate-pop">
          <Gift size={28} />
        </div>
        {info.sender && (
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted">
            <Avatar name={info.sender.name} seed={info.sender.handle} size={22} />
            {info.sender.name} sent you
          </div>
        )}
        <p className="text-6xl font-semibold tracking-tight tabular-nums">{formatUsd(info.amount)}</p>
        {info.memo && <p className="mt-3 text-lg">“{info.memo}”</p>}
      </div>

      <div className="flex flex-1 flex-col gap-4 px-6 pb-8">
        {info.status !== "open" ? (
          <p className="rounded-2xl bg-cream px-4 py-3 text-center text-sm text-muted">{closedMessages[info.status]}</p>
        ) : info.viewer?.isSender ? (
          <p className="rounded-2xl bg-cream px-4 py-3 text-center text-sm text-muted">
            This is your link. Share it with someone, or cancel it from your <Link href="/links" className="font-semibold text-copper">links</Link>.
          </p>
        ) : info.viewer ? (
          <>
            <button className="btn-primary !py-4 text-base" onClick={claim} disabled={pending}>
              {pending && <Loader2 size={18} className="animate-spin" />}
              {pending ? "Claiming…" : `Claim to my Penny, ${info.viewer.name.split(" ")[0]}`}
            </button>
            <p className="text-center text-xs text-muted">Free to claim. Penny covers the network fee.</p>
          </>
        ) : (
          <>
            <p className="text-center text-sm text-muted">Create a free account in 10 seconds to claim it. No bank details or seed phrases needed.</p>
            <AuthForm mode="signup" onDone={() => key && load(key)} />
          </>
        )}
        {error && <p className="rounded-2xl bg-rose-soft px-4 py-3 text-sm text-rose">{error}</p>}
      </div>
    </div>
  );
}
