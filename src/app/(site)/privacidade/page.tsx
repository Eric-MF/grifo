import type { Metadata } from "next";
import Link from "next/link";
import { BotaoCookies } from "@/components/AvisoCookies";
import { CONTATO, CONTROLADOR, PRIVACIDADE_ATUALIZADA, SITE } from "@/config/site";
import { ApagarDados } from "./ApagarDados";
import styles from "./privacidade.module.css";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados o Grifo trata, para quê, com quem são compartilhados e como exercer os seus direitos (LGPD).",
};

const dataPorExtenso = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

export default function Page() {
  const email = <a href={`mailto:${CONTROLADOR.email}?subject=${encodeURIComponent("Grifo: privacidade")}`}>{CONTROLADOR.email}</a>;
  return (
    <div className={`container section ${styles.politica}`}>
      <span className="eyebrow">Privacidade</span>
      <h1>Política de privacidade</h1>
      <p className="lead">
        Como o {SITE.nome} ({SITE.dominio}) trata dados pessoais, nos termos da Lei Geral de Proteção de Dados Pessoais (Lei nº
        13.709/2018, a LGPD).
      </p>
      <p className={styles.data}>Atualizada em {dataPorExtenso(PRIVACIDADE_ATUALIZADA)}.</p>

      <div className={styles.resumo}>
        <strong>Em resumo</strong>
        <ul>
          <li>Não há cadastro, login nem servidor do Grifo: não pedimos o seu nome, e-mail ou CPF.</li>
          <li>O seu progresso, as suas respostas, marcações e preferências ficam só no seu navegador. Nós não os recebemos.</li>
          <li>Estatísticas de visita (Google) só com a sua permissão, no aviso de cookies.</li>
          <li>O microfone só liga quando você pede, e o reconhecimento da fala é feito pelo seu navegador.</li>
        </ul>
      </div>

      <h2 id="controlador">Quem é o responsável</h2>
      <p>
        O controlador dos dados pessoais tratados pelo site é <strong>{CONTROLADOR.nome}</strong>. Dúvidas, pedidos e
        reclamações sobre privacidade: {email}.
      </p>
      <p>
        Por ser agente de tratamento de pequeno porte, o {SITE.nome} não indica encarregado (Resolução CD/ANPD nº 2/2022, art.
        11). O e-mail acima é o canal de comunicação com o titular dos dados.
      </p>

      <h2 id="navegador">O que fica no seu navegador</h2>
      <p>
        Para o site funcionar sem cadastro, o {SITE.nome} guarda no armazenamento local do seu navegador (o <em>localStorage</em>):
      </p>
      <ul>
        <li>o progresso nos jogos, no treino e nos simulados, as respostas e as notas;</li>
        <li>as estatísticas e conquistas, as marcações e grifos nas leis e o ponto de leitura;</li>
        <li>as preferências: tema, letra, voz, velocidade, microfone e afins;</li>
        <li>a chave de API de inteligência artificial, apenas se você marcar “Lembrar a chave”;</li>
        <li>a sua escolha no aviso de cookies.</li>
      </ul>
      <p>
        Esses dados não saem do aparelho: nenhum deles é enviado ao {SITE.nome}. Eles ficam até você apagá-los, aqui ou nas
        configurações do navegador (“Limpar dados do site”). Em computador compartilhado, quem usar o mesmo navegador verá o
        seu progresso.
      </p>
      <ApagarDados />

      <h2 id="cookies">Cookies de estatística (Google)</h2>
      <p>
        O site usa o Google Tag Manager e o Google Analytics para contar as visitas e saber quais partes são mais usadas. Eles
        só carregam se você clicar em <strong>Aceitar</strong> no aviso de cookies (base legal: consentimento, art. 7º, I, da
        LGPD). Sem a sua escolha, ou se recusar, a tag do Google não carrega.
      </p>
      <p>Com a permissão, o Google recebe:</p>
      <ul>
        <li>as páginas visitadas, de onde você veio e quanto tempo ficou;</li>
        <li>o tipo de aparelho, o sistema, o navegador, o idioma e o tamanho da tela;</li>
        <li>o endereço IP, usado para estimar a cidade ou região, e um identificador aleatório guardado em cookie.</li>
      </ul>
      <div className={styles.tabela}>
        <table>
          <thead>
            <tr>
              <th>Cookie</th>
              <th>De quem</th>
              <th>Para quê</th>
              <th>Duração</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>_ga</code>, <code>_ga_…</code>
              </td>
              <td>Google Analytics</td>
              <td>distinguir visitantes e sessões, sem identificar quem você é</td>
              <td>até 2 anos</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Os dados de estatística ficam no Google pelo prazo de retenção configurado no Google Analytics e são vistos por nós só
        em números agregados. O site não tem anúncios: os cookies de publicidade ficam sempre negados. Você pode mudar a escolha
        quando quiser; recusando, os cookies do Google são apagados.
      </p>
      <p>
        <BotaoCookies className="btn btn-ghost">Mudar a escolha dos cookies</BotaoCookies>
      </p>

      <h2 id="voz">Microfone e voz</h2>
      <p>
        O microfone só liga quando você ativa “Responder falando”, no treino, ou os comandos de voz, no Vade Mecum. Na primeira
        vez, o navegador pede a sua permissão.
      </p>
      <p>
        Quem reconhece a fala é o próprio navegador, com o serviço da empresa que o fornece. No <strong>Chrome</strong>, o áudio
        vai para os servidores do Google enquanto o microfone ouve. No <strong>Edge</strong>, vai para a Microsoft. No{" "}
        <strong>Safari</strong>, vai para a Apple, ou é tratado no próprio aparelho. Esse tratamento segue a política de
        privacidade de cada empresa.
      </p>
      <p>
        O {SITE.nome} não recebe nem grava o áudio. O texto reconhecido é usado na hora, no seu navegador, para marcar a
        resposta ou executar o comando, e não é guardado. A leitura em voz alta usa as vozes instaladas no seu aparelho.
      </p>

      <h2 id="ia">Correção por inteligência artificial</h2>
      <p>
        Nos simulados, você pode pedir uma correção a um modelo de IA usando a sua própria chave de API. A chamada vai direto do
        seu navegador para o provedor que você escolheu (Anthropic, OpenAI, Google, OpenRouter, Groq, Mistral ou DeepSeek),
        levando o enunciado e a sua resposta. O {SITE.nome} não recebe a chave nem o texto. O que o provedor faz com eles segue
        a política dele e o contrato da sua conta.
      </p>

      <h2 id="contato">Quando você nos escreve</h2>
      <p>
        Se você mandar uma sugestão, um erro ({CONTATO.sugestao}, {CONTATO.erro}) ou um pedido de privacidade por e-mail,
        recebemos o seu endereço e o que você escreveu. Usamos isso só para responder e corrigir o site (base legal: legítimo
        interesse, art. 7º, IX), e guardamos pelo tempo necessário para isso. A caixa de e-mail é do Gmail (Google).
      </p>

      <h2 id="hospedagem">Hospedagem</h2>
      <p>
        O site é hospedado no GitHub Pages (GitHub, Inc.). Como todo servidor, ele registra o endereço IP de quem visita, por
        segurança e para evitar abusos (base legal: legítimo interesse, art. 7º, IX). O {SITE.nome} não tem acesso a esses
        registros. As fontes de letra são servidas pelo próprio site, sem chamar o Google Fonts.
      </p>

      <h2 id="terceiros">Vídeos e redes sociais</h2>
      <ul>
        <li>
          <strong>Vídeos do YouTube</strong>: só carregam quando você toca para assistir, no modo de privacidade reforçada
          (youtube-nocookie.com). Ao assistir, o YouTube (Google) recebe os dados de uso do vídeo.
        </li>
        <li>
          <strong>Compartilhar</strong>: os botões das redes só abrem a rede escolhida quando você toca. A partir daí, vale a
          política dela.
        </li>
        <li>
          <strong>Links externos</strong> (Planalto, FGV, STF, STJ e outros) levam a sites com políticas próprias.
        </li>
      </ul>

      <h2 id="internacional">Transferência internacional</h2>
      <p>
        Google, GitHub e os provedores de IA guardam dados fora do Brasil, principalmente nos Estados Unidos. Essa transferência
        se apoia no art. 33 da LGPD e nas garantias contratuais que essas empresas oferecem.
      </p>

      <h2 id="direitos">Os seus direitos</h2>
      <p>Pelo art. 18 da LGPD, você pode pedir:</p>
      <ul>
        <li>a confirmação de que tratamos dados seus e o acesso a eles;</li>
        <li>a correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>a anonimização, o bloqueio ou a eliminação de dados desnecessários;</li>
        <li>a portabilidade, a informação sobre com quem os compartilhamos e a revogação do consentimento.</li>
      </ul>
      <p>
        Como quase tudo fica no seu navegador, a maior parte desses direitos você exerce sozinho: o botão “Apagar os dados”
        acima e o “Mudar a escolha dos cookies”. Para o resto, escreva para {email}. Respondemos em até 15 dias. Você também pode
        reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em gov.br/anpd.
      </p>

      <h2 id="publico">Público</h2>
      <p>
        O {SITE.nome} é feito para quem se prepara para o Exame de Ordem, e não para crianças. Não tratamos de propósito dados de
        menores de idade.
      </p>

      <h2 id="mudancas">Mudanças nesta política</h2>
      <p>
        Quando o site passar a tratar dados de outro jeito, esta página muda, com a data no alto. Voltar para o{" "}
        <Link href="/">início</Link>.
      </p>
    </div>
  );
}
