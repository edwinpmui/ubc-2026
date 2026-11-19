import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-2 px-5 pb-2 pt-6">
      {back && (
        <Link href={back} className="-ml-2 rounded-full p-2 text-ink hover:bg-cream" aria-label="Back">
          <ChevronLeft size={22} />
        </Link>
      )}
      <h1 className="flex-1 text-2xl font-semibold tracking-tight">{title}</h1>
      {action}
    </header>
  );
}
