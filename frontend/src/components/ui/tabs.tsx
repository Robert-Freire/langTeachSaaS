import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  active: string
  setActive: (v: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('useTabs must be used inside Tabs')
  return ctx
}

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string
  children: React.ReactNode
  className?: string
}) {
  const [active, setActive] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn('flex border-b border-zinc-200 gap-0', className)}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
  ...rest
}: {
  value: string
  children: React.ReactNode
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { active, setActive } = useTabs()
  const isActive = active === value
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActive(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        isActive
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-zinc-500 hover:text-zinc-800',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { active } = useTabs()
  if (active !== value) return null
  return <div className={className}>{children}</div>
}
