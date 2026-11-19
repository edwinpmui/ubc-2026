import { ActionButton } from "@/components/ActionButton";
import { LinkComposer } from "@/components/LinkComposer";
import { PageHeader } from "@/components/PageHeader";
import { formatUsd, timeAgo } from "@/lib/format";
import { linksFor, userDirectory } from "@/lib/services";
import { requirePageUser } from "@/lib/session";
import type { PayLink } from "@/lib/types";

function statusOf(link: PayLink) {
  if (link.status === "open" && link.expiresAt < Date.now()) return { label: "Expired", tone: "bg-rose-soft text-rose" };
  return {
    open: { label: "Waiting", tone: "bg-copper-soft text-copper-dark" },
    claimed: { label: "Claimed", tone: "bg-mint-soft text-mint" },
    cancelled: { label: "Refunded", tone: "bg-cream text-muted" },
  }[link.status];
}

export default async function LinksPage() {
  const user = await requirePageUser();
  const links = linksFor(user);
  const users = userDirectory();

  return (
    <>
      <PageHeader title="Pay links" />
      <div className="flex flex-col gap-6 px-5 pb-8">
        <LinkComposer />

        {links.length > 0 && (
          <section>
            <h2 className="section-title">Your links</h2>
            <ul className="card divide-y divide-line">
              {links.map((link) => {
                const status = statusOf(link);
                const claimer = link.claimerId ? users.get(link.claimerId) : null;
                return (
                  <li key={link.claimAddress} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tabular-nums">{formatUsd(link.amount)}</p>
                      <p className="truncate text-xs text-muted">
                        {link.memo || "No note"} · {timeAgo(link.createdAt)}
                        {claimer && ` · by ${claimer.name}`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>{status.label}</span>
                    {link.status === "open" && (
                      <ActionButton
                        url={`/api/links/${link.claimAddress}/cancel`}
                        className="btn-ghost !px-3"
                        pendingLabel="…"
                      >
                        {link.expiresAt < Date.now() ? "Refund" : "Cancel"}
                      </ActionButton>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
