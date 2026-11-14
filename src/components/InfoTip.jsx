import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small "i" button that opens a short explanation. It is a popover, not a hover tooltip,
 * so it also works by tap on a phone and by keyboard.
 */
export default function InfoTip({ label, children, align = "start", className }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground data-[state=open]:border-harvest data-[state=open]:text-harvest focus-ring", className)}
        >
          <Info className="h-3 w-3" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className="kisan-card z-50 w-[min(23rem,calc(100vw-1.5rem))] p-4 text-start text-[13px] font-normal normal-case leading-relaxed tracking-normal text-foreground"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
