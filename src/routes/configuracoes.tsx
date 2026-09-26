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
      <p className="mb-4 text-sm text-muted">Ajuste o dino e o jeito da lista.</p>
      <SettingGroup>
        <SettingRow title="Aparência" hint="Escuro é o padrão. Claro deixa o fundo claro.">
          <div className="flex rounded-full border border-border bg-surface-2 p-0.5">
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
                  "h-8 rounded-full px-3 text-xs font-medium",
                  theme === value ? "bg-accent text-accent-fg" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow title="Dino fala" hint="Balões de texto quando ele reage.">
          <Switch
            label="Dino fala"
            checked={prefs?.dinoTalks ?? true}
            onCheckedChange={(v) => void patch({ dinoTalks: v })}
          />
        </SettingRow>
        <SettingRow title="Dino compacto" hint="Menor no canto, melhor no celular.">
          <Switch
            label="Dino compacto"
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
