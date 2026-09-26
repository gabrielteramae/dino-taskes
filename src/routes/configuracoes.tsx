import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { Switch } from "@/components/ui/switch";
import { getPrefs, updatePrefs, type UserPrefs } from "@/lib/prefs";
import { applyTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({ component: Configuracoes });

function Configuracoes() {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);

  useEffect(() => {
    void getPrefs()
      .then(setPrefs)
      .catch(() => undefined);
  }, []);

  const patch = async (partial: Partial<UserPrefs>) => {
    if (!prefs) return;
    const optimistic = { ...prefs, ...partial };
    setPrefs(optimistic);
    if (partial.theme) applyTheme(partial.theme);
    try {
      const saved = await updatePrefs({ data: partial });
      setPrefs(saved);
      applyTheme(saved.theme);
    } catch {
      setPrefs(prefs);
      applyTheme(prefs.theme);
    }
  };

  const theme = prefs?.theme ?? "dark";

  return (
    <AuthScreen title="Configurações">
      <p className="mb-4 text-sm text-muted">Ajuste o fantasma e o jeito da lista.</p>
      <SettingGroup>
        <SettingRow title="Aparência" hint="Escuro é o padrão. Claro deixa o fundo claro.">
          <div className="relative grid w-[148px] grid-cols-2 rounded-full border border-border bg-surface-2 p-0.5">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-accent",
                "transition-transform duration-300 ease-out motion-reduce:transition-none",
                theme === "light" && "translate-x-full",
              )}
            />
            {(
              [
                ["dark", "Escuro"],
                ["light", "Claro"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={theme === value}
                onClick={() => void patch({ theme: value satisfies ThemeMode })}
                className={cn(
                  "relative z-10 h-8 rounded-full text-xs font-medium transition-colors duration-300 ease-out",
                  theme === value ? "text-accent-fg" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow title="Fantasma fala" hint="Balões de texto quando ele reage.">
          <Switch
            label="Fantasma fala"
            checked={prefs?.dinoTalks ?? true}
            onCheckedChange={(v) => void patch({ dinoTalks: v })}
          />
        </SettingRow>
        <SettingRow title="Fantasma compacto" hint="Menor no canto, melhor no celular.">
          <Switch
            label="Fantasma compacto"
            checked={prefs?.dinoSmall ?? false}
            onCheckedChange={(v) => void patch({ dinoSmall: v })}
          />
        </SettingRow>
        <SettingRow title="Confirmar ao apagar" hint="Pede um ok antes de remover uma tarefa.">
          <Switch
            label="Confirmar ao apagar"
            checked={prefs?.confirmDelete ?? false}
            onCheckedChange={(v) => void patch({ confirmDelete: v })}
          />
        </SettingRow>
      </SettingGroup>
    </AuthScreen>
  );
}
