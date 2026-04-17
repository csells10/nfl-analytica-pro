import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Sparkles, ArrowRight } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const API_BASE = "https://nfl-games-app-main-362530996210.us-central1.run.app";

interface DateSelectionModalProps {
  open: boolean;
  onConfirm: (date: Date) => void;
  defaultDate?: Date;
}

export default function DateSelectionModal({
  open,
  onConfirm,
  defaultDate,
}: DateSelectionModalProps) {
  const [date, setDate] = useState<Date | undefined>(defaultDate ?? new Date());

  // Background warmup ping — fires once when the modal opens.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    const warm = async () => {
      const candidates = [`${API_BASE}/health`, `${API_BASE}/`];
      for (const url of candidates) {
        try {
          await fetch(url, { signal: controller.signal, mode: "cors" });
          // Any response (even an error status) means the container is awake.
          return;
        } catch {
          // ignore and try next
        }
      }
    };

    warm();
    return () => controller.abort();
  }, [open]);

  const handleConfirm = () => {
    if (date) onConfirm(date);
  };

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        {/* Soft, blurred overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50",
            "bg-background/70 backdrop-blur-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
          )}
        />

        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border/60 bg-card p-7",
            "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "duration-200"
          )}
        >
          {/* Branded accent */}
          <div className="mb-5 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              GameLens · Matchup Intelligence
            </span>
          </div>

          <DialogPrimitive.Title className="text-xl font-semibold tracking-tight text-foreground">
            Select a Game Date
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Choose a date to begin exploring matchup insights.
          </DialogPrimitive.Description>

          {/* Date picker */}
          <div className="mt-6 space-y-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Game date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 w-full justify-start gap-2 rounded-lg font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {date
                    ? format(date, "EEEE, MMMM d, yyyy")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="pt-1 text-xs text-muted-foreground/80">
              Pick a date to load available game insights.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-7">
            <Button
              onClick={handleConfirm}
              disabled={!date}
              className="group h-11 w-full rounded-lg text-sm font-medium"
            >
              Load Games
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
