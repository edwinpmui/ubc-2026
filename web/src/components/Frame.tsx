export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="sm:py-8">
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden bg-white sm:min-h-[calc(100dvh-4rem)] sm:rounded-[2.25rem] sm:border sm:border-line sm:shadow-[0_30px_80px_-30px_rgba(60,35,15,0.35)]">
        {children}
      </div>
    </div>
  );
}
