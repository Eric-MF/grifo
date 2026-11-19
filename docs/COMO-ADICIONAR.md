# Como adicionar e revisar conteúdo

Guia de manutenção do site do Grifo. Quase tudo o que muda com o tempo é **conteúdo em YAML**
na pasta `content/`. O código só muda para jogos novos e geradores de perguntas.

```
content/
├─ exames/<id>/exame.yaml     enunciados, gabarito comentado, tabela de pontos, revisão
├─ perguntas/*.yaml           perguntas fixas do quiz dos jogos
├─ pecas.yaml                 catálogo de peças e sinônimos aceitos
├─ leis.yaml                  apelidos de leis e tribunais para o leitor de citações
├─ promos.yaml                anúncios da casa, espaços de anúncio e vídeos do YouTube
└─ _transcricao/termos/       termos das rubricas usados por scripts/transcrever.sh
```

Toda alteração passa pelo validador. `npm run validar` confere esquema, somas de pontos, artigos
reconhecíveis, peças existentes, ids únicos e **nenhum `TODO` esquecido**. Com erro, o conteúdo
não é publicado. Durante o `npm run dev`, o validador roda sozinho a cada arquivo salvo e mostra
os erros no terminal.

## Comandos

| Comando | Para quê |
| --- | --- |
| `npm run dev` | site local (Tailscale: `100.80.118.27:3100`; mude com `GRIFO_HOST`/`GRIFO_PORT`) e painel `/revisao/` |
| `npm run validar` | valida todo o `content/` |
| `npm test` | testes; o gabarito comentado de cada exame precisa tirar ≥ 90% na correção automática |
| `npm run novo:exame -- 41` | cria o exame 41 (rascunho automático a partir do PDF da FGV, ou modelo em branco) |
| `npm run nova:pergunta -- <id> <peça> [arquivo]` | acrescenta uma pergunta fixa ao quiz |
| `npm run nova:pergunta -- --gerador <id> <peça>` | cria um gerador de perguntas (milhares de variações) |
| `npm run novo:jogo -- <slug> "Título"` | cria um jogo novo, já jogável, na plataforma |
| `npm run revisar -- 38 "Nome" "notas"` | marca o exame 38 como revisado (`--rascunho` desfaz) |
| `npm run build` | gera o site estático em `out/` |
| `npm run build:completo` | build + PDFs atualizados (cadernos, gabaritos, folha de respostas) + build |
| `npm run preview` | serve a pasta `out/` para conferir o build |

---

## Novo exame

### 1. Material

1. Coloque os PDFs da FGV em `.examples/` (pasta fora do git), mantendo o padrão de nomes:
   - padrão de resposta: `.examples/PDF's Gabaritos/Exame da Ordem 41º - Apelação.pdf`
     (variante regional: `… - Apelação (Porto Alegre).pdf`);
   - caderno: `.examples/Caderno de Provas/OAB 41º [ Penal ] - Caderno de Provas.pdf`.
2. `node scripts/extract-text.mjs` extrai o texto para `.examples/_text/`.
3. `node scripts/sync-originais.ts` copia os PDFs para `public/downloads/originais/`. Eles
   aparecem em `/provas` mesmo antes da transcrição.

### 2. Rascunho

`npm run novo:exame -- 41` escolhe sozinho o ponto de partida:

- **Há padrão de resposta:** gera `content/exames/41/exame.yaml` com enunciados, gabarito
  comentado e tabela de pontos. Os componentes que citam artigo já vêm com `dispositivo`. Os
  componentes de tese vêm marcados com `TODO` para você escrever os `termos`.
- **Só há caderno:** indica `node scripts/exame-sem-gabarito.ts 41 "Apelação" apelacao "obs"`,
  que publica o exame só para leitura (`corrigivel: false`, sem simulado corrigido).
- **Não há nada:** cria um modelo em branco (o mesmo que `--modelo`), com todos os campos
  comentados.

### 3. Rubrica (os `termos`)

Cada linha da tabela "Distribuição dos Pontos" vira um **item**. Cada valor entre parênteses
vira um **componente**:

```yaml
- n: "3"
  secao: Petição de Interposição
  descricao: "Tempestividade: prazo de 5 dias (0,10), na forma da Súmula 700 do STF ou do Art. 586 do CPP (0,10)."
  componentes:
    - { id: c1, valor: 0.10, termos: ["prazo", "5 dias"] }
    - { id: c2, valor: 0.10, dispositivo: ["Súmula 700 STF", "art. 586 CPP"], requer: c1 }
```

| Campo | Regra |
| --- | --- |
| `termos` | **todos** precisam aparecer (E) |
| `a \| b` dentro de um termo | qualquer um dos dois (OU) |
| `retrat*` | prefixo de palavra (retratação, retratar…) |
| `re:<regex>` | expressão regular sobre o texto normalizado |
| `alternativas` | lista de conjuntos de termos; basta um conjunto casar |
| `dispositivo` | basta uma das citações aparecer (`art. 33, § 2º, c, CP`, `Súmula 700 STF`, `Lei 11.343/06`) |
| `dispositivo` + `termos` | pontua se qualquer um dos dois casar ("entendimento do STJ ou art. 72 do CP") |
| `requer: c1` | só pontua se `c1` pontuou ("a mera citação do dispositivo legal não confere pontuação") |
| `teto` (no item) | limita o total do item, quando a FGV manda escolher teses |

O texto do aluno é comparado **normalizado**: minúsculo e sem acento; `artigo`, `art.` e `art`
são equivalentes; romanos e arábicos, números por extenso ("cinco dias"), datas ("1º de setembro
de 2023" = "01/09/2023") e leis ("Lei nº 11.343/2006" = "lei 11343") também se equivalem. Escreva
os termos do jeito natural; não é preciso tirar acentos.

Dicas:
- Prefira termos curtos e característicos (`"continuidade delitiva | crime continuado"`) a frases inteiras.
- Para um termo que se repete em vários itens, combine-o com algo específico do item.
- Os valores da peça precisam somar 5,00 e os de cada questão 1,25 (ou o `valor` informado).

Há duas formas de trabalhar:

- **Direto no YAML:** troque cada `TODO` pelos termos.
- **Arquivo de termos:** reaproveitável se o rascunho precisar ser regerado. Use
  `content/_transcricao/termos/41.json`, com chaves `"<item>.<componente>"` na peça e
  `"qN:<item>.<componente>"` nas questões, e rode `scripts/transcrever.sh 41`. Exames
  ajustados à mão, como o 38, avisam no cabeçalho para **não** usar o script.

### 4. Conferência

1. `npm run validar` até não restar erro.
2. `npm run dev` → `/revisao/41/`: o PDF original aparece ao lado da transcrição, e o próprio
   gabarito comentado passa pela correção automática. O que ficou sem pontuar indica termo mal
   escolhido.
3. `npm test` (o gabarito precisa tirar ≥ 90% em cada parte).
4. Revisão jurídica e `npm run revisar -- 41 "Seu nome" "observações"`.
5. `npm run build:completo` gera o caderno e o gabarito atualizados em PDF.

### O que muda nos PDFs atualizados

Tudo fica em `atualizado`, no fim do YAML do exame. O padrão de resposta traz as notas ao fim de cada parte e fecha com a
página "Diferenças em relação à prova original", que lista tudo (`src/components/print/Diferencas.tsx`). O caderno não
tem essa página nem os links dos artigos, porque em regra é impresso.

```yaml
atualizado:
  revisao: { status: rascunho }
  notas:
    - alvo: peca          # ou q1..q4
      item: "6.1"         # opcional
      lei: Lei 14.994/2024
      texto: O feminicídio passou a ser crime autônomo (art. 121-A do CP)…
    - alvo: q5
      tipo: jurisprudencia   # o STF ou o STJ mudou a leitura da lei (o padrão é "lei")
      lei: "STF, HC 111.840 (2012) e ARE 1.052.700 (Tema 972, 2017)"
      texto: O regime inicialmente fechado do caso vinha do art. 2º, § 1º, da Lei 8.072/1990…
  nomes:                  # as pessoas com nomes da mitologia, ligados ao papel no caso
    peca: { Júlio: Prometeu }          # o primeiro nome da pessoa na prova → o nome novo, do mesmo gênero
    q1: { Pedro: Hermes, Luiza: Dafne }
    q2: { José: José }                 # o mesmo nome: fica como está (um autor citado no gabarito)
    empresas: { Banco Peixe: Banco Hefesto }   # a prova toda, tal e qual
  correcoes:              # erro material da prova: a versão atualizada fica como se ela tivesse saído certa
    - alvo: peca
      trocas:              # cada trecho exato (com os nomes da prova) muda no enunciado, no gabarito e nos itens da parte
        - { de: "inciso II, alínea b, do Código Penal", para: "inciso II, alínea d, do Código Penal" }
        - { de: "alínea d (ou b), do CP", para: "alínea d, do CP" }
      motivo: Na prova original, o juiz…   # o único registro do erro: fim do padrão de resposta, "Erro material corrigido"
  diferencas:             # o resto (a tabela de pontos estimada…)
    - { texto: "A FGV não publicou a distribuição dos pontos deste exame…" }
```

- **Notas:** a de lei segue a regra de sempre. A revogação vale para qualquer exame. A alteração só vale quando a prova
  é anterior a ela. A de jurisprudência só entra quando a prova é anterior à decisão e o caso depende dela.
- **Nomes:** quem é pessoa sai de `content/nomes-pessoas.yaml`. O build avisa a pessoa sem nome novo e o nome que não
  aparece no texto. É erro dar o mesmo nome a duas pessoas da mesma parte, dar o nome de outra pessoa da parte ou
  trocar o gênero (quando o nome está em `nomes-mitologia.yaml`). Grafias da mesma pessoa ("Júnior" e "Junior")
  levam o mesmo nome. O comentário depois de cada linha diz o porquê da escolha.
- **Correções:** só para erro material claro da banca. Corrija tudo como se a prova tivesse saído certa (enunciado,
  gabarito comentado e itens, inclusive o que o padrão aceitava só por causa do erro); o erro original aparece só no
  `motivo`. O build dá erro quando o trecho `de` de uma troca não está em nenhum texto da parte. O `motivo` não usa os
  nomes das pessoas (eles mudam no PDF).

---

## Nova pergunta do quiz

As perguntas vêm de duas fontes que se misturam no sorteio: os **geradores** (casos montados
por combinação, centenas de variações cada) e as **perguntas fixas** (casos reais de exames,
em YAML). Cerca de 1 em cada 5 perguntas é fixa.

### Pergunta fixa

```
npm run nova:pergunta -- oab41-apelacao apelacao exames
```

Acrescenta o esqueleto em `content/perguntas/exames.yaml` (o arquivo é criado se não existir).
Campos:

- `caso`: a narrativa, sem revelar a peça.
- `peca`: chave de `content/pecas.yaml`.
- `fundamentos`: do mais esperado ao alternativo. No nível difícil, o jogador precisa acertar o
  parágrafo, inciso ou alínea do fundamento que estiver escrito.
- `distratores`: três peças plausíveis para as alternativas do nível fácil.
- `explicacao`: aparece depois da resposta.
- `fonte`: exame de origem.

Os níveis do jogo:
1. **Fácil:** alternativas, só a peça.
2. **Médio:** digitar a peça e o artigo.
3. **Difícil:** também o parágrafo, inciso ou alínea.

### Gerador

```
npm run nova:pergunta -- --gerador carta-testemunhavel carta-testemunhavel
```

Cria `src/quiz/geradores/carta-testemunhavel.ts`, já registrado. Para variar os casos, use
`rng.pick([...])` e os dados prontos de `src/quiz/dados.ts`: nomes, crimes com artigo, varas e
datas. `npm test` cobre todo gerador registrado. Ele exige casos variados, peça e fundamentos
reconhecidos, nenhum `TODO`, distratores, e que a resposta esperada seja aceita no nível difícil.

### Teses das provas ("Por dentro da peça" e "Questões discursivas")

Cada item da tabela de pontos que tem artigo vira uma pergunta, em `content/perguntas/discursivas/<exame>.yaml`.
`node scripts/gerar-perguntas-exames.ts` cria os rascunhos e preserva o que já está revisado, as introduções e a lista
`fora`.

```yaml
exame: "40"
introducoes:               # o caso de cada parte em poucas linhas, sem a resposta
  peca: "Gustavo, entregador por aplicativo, entrou por sete dias seguidos num depósito…"
fora: ["40-peca-1", "40-peca-3"]   # itens deixados de fora de propósito: o gerador não os recria
perguntas:
  - id: 40-peca-6
    categoria: peca-detalhe   # ou discursiva
    parte: peca               # ou q1..q4
    item: "6"
    secao: pedido
    pergunta: "No oitavo dia, Gustavo entrou pela porta aberta. Que pedido a defesa deve fazer quanto a esse fato?"
    tese: "Desclassificação do oitavo fato para furto simples: Gustavo entrou pela porta, sem escalada"
    aceitos: [ [ "desclassific* | afast*", "simples | escalada | qualificadora" ], [ "furto simples" ] ]
    artigos: [ "art. 155, CP" ]
    gabarito: "…o padrão de respostas da FGV…"
    revisao: { status: revisado }
```

Os níveis do jogo:
1. **Fácil:** a tese e quatro artigos, ou o artigo e quatro teses. O artigo aparece só pelo número, sem o texto.
2. **Médio:** digitar o ponto central (a tese).
3. **Difícil:** o ponto central e o artigo, com o parágrafo, o inciso ou a alínea.

- **Tese:** começa pelo instituto e se lê sem a pergunta, porque o fácil mostra só ela: "Desclassificação para furto
  simples", não "Para furto simples"; nada de "Sim:" ou "Não:" soltos. Não cita o artigo.
- **Aceitos:** grupos de termos na sintaxe da correção (`|` separa alternativas, `*` completa a palavra). Basta um grupo
  inteiro, e a tese precisa conter um deles (o build confere).
- **Introdução e pergunta:** sem os termos aceitos (o build avisa) e sem citar artigos.
- **Fora do jogo:** endereçamento, prazo, pedidos genéricos, rol de testemunhas e todo item sem artigo. Sai também o
  item cuja resposta a lei nova superou, com a nota em `atualizado.notas` do exame.
- **Alternativas erradas do fácil:** o build as tira das teses e dos artigos das outras perguntas, das mais parecidas
  para as outras.

### Peças e leis

- **Sinônimo de peça** ("RESE", "defesa prévia"): acrescente em `aliases` de `content/pecas.yaml`.
- **Apelido de lei** ("lei de drogas"): acrescente em `content/leis.yaml`. Qualquer "Lei 1234"
  já é reconhecida sem cadastro.

---

## Novo jogo

```
npm run novo:jogo -- tribunal-runner "Tribunal Runner" --emoji 🏃
```

Cria `src/games/tribunal-runner/index.ts` a partir de um modelo **já jogável** (uma cesta que
apanha processos; o ⚖️ dispara uma pergunta) e a entrada em `src/games/registry.ts`. O jogo
aparece sozinho em `/jogos/` e em `/jogos/tribunal-runner/`.

O jogo implementa o contrato `GameModule` de `src/games/types.ts`:

- **`criar(canvas, host, opcoes)`:** desenha no canvas e devolve
  `iniciar/pausar/continuar/configurar/destruir`.
- **`host.perguntar({ tipo: "poder", poderNome })`:** abre a pergunta, com o anúncio lateral,
  e resolve `true` se o jogador acertou.
- **`host.estado(...)`, `host.hud(...)`, `host.fimDeJogo(...)`:** informam a plataforma, que
  cuida de menu, níveis, som, pausa, recordes, card de compartilhamento e código de verificação.
  Em `fimDeJogo`, o campo `extras` traz as estatísticas próprias do jogo, como colunas e moedas.
- **`estilos`:** os estilos visuais alternáveis no menu. Acrescente novos sempre no fim, porque
  o índice entra no código de verificação.
- **`comoJogar`:** o texto da seção "Como jogar" do menu.

Em desenvolvimento, `?debug=1` na URL liga o modo de teste do jogo. No modelo, o primeiro poder
cai logo e não se perdem vidas.

No registro, `id` é o número do jogo no código de verificação (1 a 15) e **nunca deve ser
reutilizado**. `dica` é o texto mostrado antes do primeiro toque e `capa` é uma imagem opcional
(veja "Imagens").

O Flap Suitcase (`src/games/flap-suitcase/`) é o exemplo completo:
- `engine.ts`: física, cenário e clima.
- `themes.ts`: os 7 estilos; para criar outro, copie um objeto de `TEMAS`.
- `powers.ts`: os 10 poderes.
- `audio.ts`: os sons sintetizados.

---

## Desbloquear tudo (só para testes)

Para ver todos os estilos e personagens do Flap Suitcase sem jogar, crie na raiz do projeto o arquivo `.env.development.local` com:

```
NEXT_PUBLIC_GRIFO_DESBLOQUEAR_TUDO=1
```

Rode `npm run dev` de novo. O arquivo está no `.gitignore` (`.env*`) e não é usado no `npm run build`: em produção a opção é sempre desligada (`TUDO_LIBERADO` em `src/games/progresso.ts`). Para voltar ao normal, apague o arquivo.

## Anúncios, curso e vídeos

- **Link do curso:** `COURSE_URL` em `src/config/site.ts`. Enquanto estiver vazio, os anúncios da
  casa levam à seção `#curso` da landing.
- **Rede de anúncios:** `ADS` em `src/config/site.ts` (`provider: "adsense"` e `client`). Os slots
  ficam em `content/promos.yaml`. Sem rede configurada, os espaços mostram um anúncio da casa.
- **Promoções:** em `content/promos.yaml`, `locais` diz o que pode aparecer em cada lugar:
  - `pausa-simulado`: centro da tela quando o cronômetro do simulado é pausado;
  - `quiz-lateral`: lateral do jogo durante as perguntas;
  - `resultado`: tela de resultado do simulado.

  O campo `peso` define a chance relativa de cada promoção.
- **Vídeo do YouTube:**

  ```yaml
  - { tipo: youtube, id: aula-rese, video: "ID_DO_VIDEO", titulo: "RESE em 5 minutos" }
  ```

  Depois, inclua `aula-rese` nos `locais` desejados. Só a miniatura carrega; o player
  (youtube-nocookie) abre quando a pessoa clica.

## Correção por IA

Os provedores ficam em `src/lib/ia/provedores.ts`. Para incluir um provedor compatível com
"chat completions", basta uma entrada em `PROVEDORES` com `endpoint` e sugestões de modelo.
Formatos diferentes pedem uma função em `chamar()`. As chamadas vão direto do navegador ao
provedor, com a chave do aluno; o site não tem servidor.

## Imagens

Coloque o original em `assets/imagens/<nome>.jpg` e rode `node scripts/optimize-images.mjs`.
O script gera os WebP em `public/img/`. Use pelo nome:
- `capa: "<nome>"` no registro de jogos;
- `optionalImage("<nome>")` nas páginas.

Sem a imagem, o site usa o desenho de reserva.

---

## Fluxo de revisão

1. `npm run dev` → `/revisao/`: lista todos os exames com o status de revisão e o resultado da
   correção-teste.
2. Em cada exame, `/revisao/<id>/` mostra o PDF original ao lado da rubrica e da pontuação que o
   gabarito comentado obteve.
3. Corrija o YAML; o painel atualiza ao salvar.
4. `npm run revisar -- <id> "Revisor" "notas"` grava quem revisou e quando.

Pontos de atenção conhecidos:
- **Exames 01 e 11:** a FGV não publicou a distribuição de pontos. A rubrica foi estimada e
  está registrada em `observacoes`.
- **Exame 05:** o PDF do padrão de resposta no acervo é cópia do exame 04, então o exame está
  sem correção (`corrigivel: false`).
- **Exame 39:** não está no acervo.
- **Exame 40:** só há o caderno.
- **Variantes regionais:** o código de verificação distingue só a variante principal (0) e uma
  variante regional (1) por exame. Um segundo caderno regional do mesmo exame exigiria um número
  próprio em `Resultado.tsx`.
