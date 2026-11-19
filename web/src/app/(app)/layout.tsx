import { BottomNav } from "@/components/BottomNav";
import { Frame } from "@/components/Frame";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Frame>
      <main className="flex flex-1 flex-col">{children}</main>
      <BottomNav />
    </Frame>
  );
}
