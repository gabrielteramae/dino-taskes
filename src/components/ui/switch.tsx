import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
};

export function Switch({ checked, onCheckedChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-7 w-11 shrink-0 rounded-full transition-colors duration-150",
        checked ? "bg-accent" : "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-6 rounded-full bg-fg transition-transform duration-150",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
