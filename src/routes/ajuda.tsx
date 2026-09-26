import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";

export const Route = createFileRoute("/ajuda")({ component: Ajuda });

const FAQS = [
  {
    title: "Como adiciono uma tarefa?",
    hint: "Escreve no campo e toca no +. O fantasma anota e reage.",
  },
  {
    title: "Como marco como feita?",
    hint: "Toca no quadradinho à esquerda. Toca de novo se quiser desfazer.",
  },
  {
    title: "O que o fantasma faz?",
    hint: "Clica nele, arrasta pelo canto e ele olha o ponteiro. Só aparece depois do login.",
  },
  {
    title: "Os emojis?",
    hint: "O app lê o texto (café, treino, estudo…) e coloca um ícone ao lado.",
  },
  {
    title: "Minhas tarefas aparecem para outra pessoa?",
    hint: "Não. Cada conta vê só a própria lista.",
  },
  {
    title: "Como saio?",
    hint: "Engrenagem no canto → Sair. No Grok, a sessão pode voltar sozinha.",
  },
];

function Ajuda() {
  return (
    <AuthScreen title="Ajuda">
      <p className="mb-4 text-sm text-muted">Em um minuto.</p>
      <SettingGroup>
        {FAQS.map((item) => (
          <SettingRow key={item.title} title={item.title} hint={item.hint} />
        ))}
      </SettingGroup>
      <p className="mt-8 text-center text-[11px] leading-relaxed text-subtle">
        © 2026 Gabriel Teramae Chan. Todos os direitos reservados.
      </p>
    </AuthScreen>
  );
}
