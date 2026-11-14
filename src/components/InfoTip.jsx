import { useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small "i" that explains something. It opens when the pointer rests on it (and closes when
 * the pointer leaves); a tap or click also opens it, so it works on phones and by keyboard.
 */
export default function InfoTip({ label, children, align = "start", className }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 120);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onPointerEnter={(e) => e.pointerType === "mouse" && show()}
          onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
          className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground data-[state=open]:border-harvest data-[state=open]:text-harvest focus-ring", className)}
        >
          <Info className="h-3 w-3" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align={align}
          sideOffset={10}
          collisionPadding={12}
          onPointerEnter={show}
          onPointerLeave={hide}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="kisan-menu z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border bg-popover p-3.5 text-start text-[13px] font-normal normal-case leading-relaxed tracking-normal text-popover-foreground shadow-lg"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
