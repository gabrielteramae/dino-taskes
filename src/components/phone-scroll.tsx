import * as ScrollArea from "@radix-ui/react-scroll-area";
import type { ReactNode } from "react";

export function PhoneScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollArea.Root className="min-h-0 w-full flex-1">
      <ScrollArea.Viewport className="size-full [&>div]:!block">
        {children}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className="flex w-1.5 touch-none p-0.5">
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
