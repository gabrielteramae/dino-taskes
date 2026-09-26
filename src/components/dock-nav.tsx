import type { LucideIcon } from "lucide-react";
import { CalendarDays, CircleCheck, House } from "lucide-react";
import { cn } from "@/lib/utils";

export type DockTab = "tarefas" | "hoje" | "feitas";

const ITEMS: Array<{ id: DockTab; label: string; icon: LucideIcon }> = [
  { id: "tarefas", label: "Tarefas", icon: House },
  { id: "hoje", label: "Agenda", icon: CalendarDays },
  { id: "feitas", label: "Feitas", icon: CircleCheck },
];

export function DockNav({ tab, onChange }: { tab: DockTab; onChange: (tab: DockTab) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex flex-col items-center gap-2 px-3">
      <nav
        aria-label="Seções"
        className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-border bg-surface p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
      >
        {ITEMS.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex h-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out",
                active
                  ? "gap-2 bg-accent px-3.5 text-accent-fg"
                  : "w-11 text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={2} />
              {active ? (
                <span className="text-sm font-medium">{item.label}</span>
              ) : (
                <span className="sr-only">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
      <span className="h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
    </div>
  );
}
