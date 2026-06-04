"use client";

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
};

function fmt(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const label =
    value?.from && value?.to
      ? `${fmt(value.from)} – ${fmt(value.to)}`
      : value?.from
        ? `From ${fmt(value.from)}`
        : "Pick a date range";

  const hasValue = Boolean(value?.from || value?.to);

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 gap-2 rounded-[1rem] text-xs font-normal ${
              hasValue ? "border-primary/50 bg-primary/5 text-foreground" : "text-muted-foreground"
            }`}
          >
            <CalendarIcon className="size-3.5 shrink-0" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            showOutsideDays={false}
            disabled={{ after: new Date() }}
          />
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              disabled={!hasValue}
              onClick={() => onChange(undefined)}
            >
              Reset
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!hasValue}
              onClick={() => setOpen(false)}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {hasValue && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onChange(undefined)}
          aria-label="Clear date range"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
