"use client"

import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1 absolute top-0 inset-x-0 justify-between z-10",
        button_previous: cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-muted"
        ),
        button_next: cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-muted"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "h-9 w-9 inline-flex items-center justify-center rounded-md",
          "hover:bg-muted hover:text-foreground cursor-pointer",
          "aria-selected:opacity-100"
        ),
        day_button: cn(
          "h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md",
          "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground/50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
