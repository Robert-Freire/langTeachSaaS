interface PillTab {
  key: string
  label: string
  badge?: boolean
}

interface PillTabsProps {
  tabs: PillTab[]
  activeTab: string
  onTabChange: (key: string) => void
}

export function PillTabs({ tabs, activeTab, onTabChange }: PillTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
          data-testid={`tab-${tab.key}`}
          className={`shrink-0 px-3 py-2 sm:px-5 sm:py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === tab.key
              ? 'text-indigo-700 bg-white'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-[#F4F2FD]'
          }`}
          style={activeTab === tab.key ? { boxShadow: '0 1px 3px rgba(26, 27, 34, 0.08)' } : undefined}
        >
          <span className="relative">
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-2 h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
