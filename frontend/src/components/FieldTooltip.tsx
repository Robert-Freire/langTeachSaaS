// Uses @base-ui/react primitives directly (not the shared ui/tooltip wrapper)
// because the shared wrapper bakes in a dark background and arrow that cannot
// be cleanly overridden for the Stitch white-bg tooltip style this component needs.
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { Info } from 'lucide-react'
import { getFieldTooltip } from '@/lib/field-tooltips'

interface FieldTooltipProps {
  fieldKey: string
}

export function FieldTooltip({ fieldKey }: FieldTooltipProps) {
  const entry = getFieldTooltip(fieldKey)
  if (!entry) return null

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        render={<span tabIndex={0} className="inline-flex items-center" />}
        data-testid={`field-tooltip-${fieldKey}`}
      >
        <Info className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-500 transition-colors cursor-help" />
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="top" sideOffset={4} className="isolate z-50">
          <TooltipPrimitive.Popup
            className="z-50 max-w-xs rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.10)' }}
            data-testid={`field-tooltip-content-${fieldKey}`}
          >
            {entry.short}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
