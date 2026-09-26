import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LegalScreen } from "@/components/legal-screen";

export const Route = createFileRoute("/termos")({ component: Termos });

const UPDATED = "26 de setembro de 2026";

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Termos() {
  return (
    <LegalScreen title="Termos e direitos">
      <p className="text-sm text-muted">Atualizado em {UPDATED}.</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        <a href="#uso" className="rounded-full border border-border px-3 py-1.5 text-fg">
          Termos de uso
        </a>
        <a href="#privacidade" className="rounded-full border border-border px-3 py-1.5 text-fg">
          Privacidade
        </a>
        <a href="#direitos" className="rounded-full border border-border px-3 py-1.5 text-fg">
          Direitos
        </a>
      </nav>

      <div className="mt-8 flex flex-col gap-8">
        <Block id="uso" title="Termos de uso">
          <p>
            Este app é uma lista pessoal de tarefas. Ao criar uma conta ou entrar, você concorda com estes termos, com a
            política de privacidade e com os direitos descritos abaixo.
          </p>
          <p>
            A conta é sua. O acesso é por e-mail e senha ou pelo Google. Você é responsável por guardar o acesso e por
            tudo o que escrever na lista.
          </p>
          <p>
            O texto das tarefas é seu. O app só guarda esse texto para mostrar a lista para você, na sua conta.
          </p>
          <p>
            Não use o app para conteúdo ilegal, para invadir conta alheia ou para prejudicar outra pessoa. A lista de
            cada conta fica separada.
          </p>
          <p>
            O app pode mudar, pausar ou deixar de funcionar. Não há promessa de que ele ficará no ar o tempo todo nem
            de que uma tarefa não se perca. Exporte a lista se quiser uma cópia sua.
          </p>
          <p>Vale a legislação brasileira.</p>
        </Block>

        <Block id="privacidade" title="Política de privacidade">
          <p>
            O responsável pelos dados é Gabriel Teramae Chan. Esta política vale para a conta e para a lista deste app,
            nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
          <p>Dados usados para a conta e a lista funcionar:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>e-mail e nome que você informa</li>
            <li>senha, guardada só como hash, nunca em texto aberto</li>
            <li>tarefas, dia marcado, ordem e se já foram feitas</li>
            <li>preferências da conta, como o tema claro ou escuro</li>
            <li>se entrar com Google, o identificador e o e-mail que o Google devolve</li>
          </ul>
          <p>
            Esses dados servem para autenticar você, mostrar só a sua lista e lembrar as preferências. Não vendemos
            dados e não usamos a lista para anúncio.
          </p>
          <p>
            No login com Google, a senha do Google não fica neste app. O Google autentica você e envia o necessário
            para abrir a conta. O logo do Google é da Google e só indica esse login.
          </p>
          <p>
            A sessão de login fica num cookie do navegador. A escolha de tema claro ou escuro fica neste aparelho. Não
            há rastreador de anúncio.
          </p>
          <p>
            Os dados ficam enquanto a conta existir. Na tela Privacidade, com a conta aberta, dá para baixar as tarefas
            ou apagar a lista. Nome e e-mail se ajustam no Perfil. Apagar as tarefas não apaga o e-mail da conta.
          </p>
          <p>
            Você pode pedir acesso, correção, informação e uma cópia do que está na lista. A exportação em JSON cobre a
            portabilidade das tarefas.
          </p>
        </Block>

        <Block id="direitos" title="Direitos autorais">
          <p>
            O aplicativo, os textos da interface e o ícone são de Gabriel Teramae Chan. © 2026. Todos os direitos
            reservados. Não copie, revenda ou publique o app, no todo ou em parte, sem autorização.
          </p>
          <p>
            O que você escreve nas tarefas continua sendo seu. Enviar uma tarefa não transfere esse texto para o autor
            do app.
          </p>
          <p>
            Bibliotecas de código aberto usadas no projeto permanecem com a licença de cada autor. O nome e o logo do
            Google pertencem à Google e não fazem parte desta marca.
          </p>
        </Block>
      </div>

      <p className="mt-8 text-sm text-muted">
        Com a conta aberta, a tela{" "}
        <Link to="/privacidade" className="font-medium text-accent hover:underline">
          Privacidade
        </Link>{" "}
        exporta ou apaga a lista.
      </p>
    </LegalScreen>
  );
}
