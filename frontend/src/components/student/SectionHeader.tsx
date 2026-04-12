export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-zinc-500 mb-3">
      {children}
    </h3>
  )
}
