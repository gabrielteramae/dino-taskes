import type { LucideIcon } from "lucide-react";
import { CalendarDays, CircleCheck, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export type DockTab = "tarefas" | "hoje" | "feitas";

const ITEMS: Array<{ id: DockTab; label: string; icon: LucideIcon }> = [
  { id: "tarefas", label: "Lista", icon: ListChecks },
  { id: "hoje", label: "Calendário", icon: CalendarDays },
  { id: "feitas", label: "Feitas", icon: CircleCheck },
];

export function DockNav({ tab, onChange }: { tab: DockTab; onChange: (tab: DockTab) => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-end gap-1">
        <nav aria-label="Seções" className="flex min-w-0 flex-1 items-center justify-around">
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
                  "flex h-14 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 text-[11px]",
                  active ? "bg-surface-2 text-fg" : "text-subtle",
                )}
              >
                <Icon className="size-5" strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
