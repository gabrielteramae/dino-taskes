import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { Switch } from "@/components/ui/switch";
import { getPrefs, updatePrefs, type UserPrefs } from "@/lib/prefs";

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
    try {
      setPrefs(await updatePrefs({ data: partial }));
    } catch {
      setPrefs(prefs);
    }
  };

  return (
    <AuthScreen title="Configurações">
      <p className="mb-4 text-sm text-muted">Ajuste o dino e o jeito da lista.</p>
      <SettingGroup>
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
