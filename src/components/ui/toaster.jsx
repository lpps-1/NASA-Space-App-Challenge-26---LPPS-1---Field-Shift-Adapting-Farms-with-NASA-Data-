import { Toaster as Sonner } from "sonner";

/** App-wide toast outlet. Use `import { toast } from "sonner"` anywhere. */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "!bg-card !text-card-foreground !border-border !rounded-xl",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
