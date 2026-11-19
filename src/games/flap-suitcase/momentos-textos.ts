// Os "momentos" do Visual das melhorias: o que aparece na tela no instante que marca cada poder, mostrando o que ele faz
// (o caminho que o Voo do Grifo vai seguir e o grito do fim, o círculo de cada batida das asas de cera, a coluna que vai
// para a pasta no Arquivamento, a fênix que ganha a vida…). Aqui só os textos e o tempo de cada um, para o menu e os
// testes; o desenho fica em momentos.ts. Os níveis 1, 3 e 5 do Visual são o momento, cada vez mais completo:
// 1 o básico, 3 com mais um elemento (carimbo, onomatopeia, o objeto do poder) e 5 com a aparição do personagem dono
// do poder (ou, nos poderes dos orbes, o emblema dele). Os níveis 2 e 4 são o motivo em volta e o brilho (aura.ts).

import type { IdPoder } from "./powers";

export interface TextoMomento {
  /** quando o momento aparece */
  quando: string;
  /** os nomes dos níveis 1, 3 e 5 do Visual */
  nomes: [string, string, string];
  /** segundos na tela */
  dur: number;
  /** onde ele acontece: no personagem, numa coluna ou numa moeda (a prévia do menu usa para posicionar) */
  ancora: "jogador" | "coluna" | "moeda";
}

export const TEXTOS_MOMENTO: Record<IdPoder, TextoMomento> = {
  // poderes dos orbes
  escudo: { quando: "ao segurar uma batida", nomes: ["O escudo estilhaça ao segurar a batida", "Carimbo “Concedido”", "O emblema do Habeas Corpus"], dur: 1, ancora: "jogador" },
  ima: { quando: "enquanto atrai, e a cada moeda", nomes: ["As linhas do ímã até as moedas, e a página que vira", "Páginas e “§” subindo", "O Vade Mecum aberto, brilhando"], dur: 0.8, ancora: "moeda" },
  lento: { quando: "ao ativar", nomes: ["O relógio desacelera ao ativar", "Ondas lentas do tempo", "O emblema do Prazo em Dobro"], dur: 1.5, ancora: "jogador" },
  mini: { quando: "ao encolher", nomes: ["Bolhas que se fecham ao encolher", "A lupa que procura a maleta", "O emblema da Insignificância"], dur: 1.1, ancora: "jogador" },
  fantasma: { quando: "ao atravessar uma coluna", nomes: ["A coluna ondula ao ser atravessada", "A imagem que fica para trás", "Carimbo “Absolvido” e o emblema"], dur: 0.9, ancora: "coluna" },
  dobro: { quando: "a cada coluna passada", nomes: ["“×2” a cada coluna passada", "Os “×2” voando", "A medalha dourada do ×2"], dur: 0.8, ancora: "coluna" },
  leve: { quando: "enquanto guia, e no pulso do fim", nomes: ["O caminho traçado até os vãos e a onda do fim", "Penas douradas espalhadas", "O emblema das Asas de Ouro"], dur: 1.2, ancora: "jogador" },
  congelar: { quando: "nas colunas paradas", nomes: ["A geada nas colunas paradas", "Carimbo “Transitado em julgado”", "Flocos rodopiando nas colunas"], dur: 1.5, ancora: "coluna" },
  prescricao: { quando: "nas colunas apagadas", nomes: ["As colunas envelhecem e viram pó", "A ampulheta e o carimbo “Prescrito”", "Folhas de calendário voando"], dur: 1.5, ancora: "coluna" },
  revisao: { quando: "ao ganhar a vida", nomes: ["O coração com “+1” ao ganhar a vida", "O processo reaberto: “Revista”", "O emblema da Revisão Criminal"], dur: 1.5, ancora: "jogador" },
  // poderes dos personagens
  arquivamento: { quando: "na coluna arquivada", nomes: ["A coluna vai para a pasta e a pasta para o arquivo", "Carimbo “Arquivado”", "A Maleta aparece"], dur: 1.5, ancora: "coluna" },
  equilibrio: { quando: "ao ativar, nos vãos", nomes: ["Os vãos se abrem e o travessão se nivela", "Os pratos equilibrados", "A Balança aparece"], dur: 1.3, ancora: "coluna" },
  inquerito: { quando: "enquanto investiga, e a cada moeda", nomes: ["A lupa vigia onde as moedas surgem, e a digital", "A lupa examina a digital", "O Delegado aparece"], dur: 0.9, ancora: "moeda" },
  presuncao: { quando: "ao passar por uma rachada", nomes: ["A rachada se fecha quando você passa", "A pomba e o carimbo “Inocente”", "O Defensor aparece"], dur: 1.1, ancora: "coluna" },
  dosimetria: { quando: "a cada coluna passada", nomes: ["O martelo bate o “+3” em cada coluna", "A onda do golpe", "O Juiz aparece"], dur: 0.9, ancora: "coluna" },
  denuncia: { quando: "nas rachadas removidas", nomes: ["A rachada apontada, riscada e rasgada", "Carimbo “Denunciado”", "O Promotor aparece"], dur: 1.3, ancora: "coluna" },
  tipificacao: { quando: "ao ativar", nomes: ["Os “§” sobem e as moedas chegam", "O código aberto", "O Código Penal aparece"], dur: 1.5, ancora: "jogador" },
  voo: { quando: "enquanto voa, e no grito do fim", nomes: ["O caminho traçado até os vãos e as ondas do grito", "O “KRÍÍÍ!” do grito", "O grifo aparece gritando"], dur: 1.4, ancora: "jogador" },
  galope: { quando: "nas colunas que se recolhem", nomes: ["Poeira nas colunas que se recolhem", "As faíscas das ferraduras", "O Peçasus aparece galopando"], dur: 0.9, ancora: "coluna" },
  garras: { quando: "nas colunas quebradas", nomes: ["Três arranhões partem cada coluna", "Lascas e arranhões em brasa", "A Gabaruda aparece"], dur: 1.1, ancora: "coluna" },
  renascer: { quando: "quando a fênix ganha a vida", nomes: ["A coluna de fogo quando a fênix ganha a vida", "O coração em chamas “+1”", "A fênix renasce das chamas"], dur: 1.7, ancora: "jogador" },
  sabedoria: { quando: "a cada coluna passada", nomes: ["“XP ×2” e estrelas em cada coluna", "Os olhos da coruja no céu", "A Corujuris aparece"], dur: 1, ancora: "coluna" },
  tesouro: { quando: "ao ativar, e enquanto atrai", nomes: ["O baú se abre, e as linhas do ímã", "O sopro de fogo do dragão", "O Dracofisco aparece"], dur: 1.5, ancora: "jogador" },
  liberdade: { quando: "ao ativar", nomes: ["As correntes se partem e a vida chega", "A gaiola se abre", "A Harpia Corpus aparece"], dur: 1.4, ancora: "jogador" },
  eco: { quando: "a cada pulso, enquanto dura", nomes: ["O sonar acha as moedas, e as linhas do ímã", "Os ecos voltando das colunas", "O Morcegravo aparece"], dur: 1, ancora: "jogador" },
  "asas-de-cera": { quando: "a cada batida de asas", nomes: ["O círculo da batida, a rajada e a cera", "Penas que se soltam", "As asas de cera gigantes e o sol"], dur: 0.55, ancora: "jogador" },
  pterossauro: { quando: "a cada batida de asas", nomes: ["O círculo da batida e a rajada forte", "Folhas de samambaia no vento", "A asa gigante do pterossauro"], dur: 0.6, ancora: "jogador" },
  foco: { quando: "a cada coluna passada", nomes: ["“×3” e o tomate em cada coluna", "O relógio do pomodoro", "O Pombodoro aparece"], dur: 0.9, ancora: "coluna" },
  agravo: { quando: "ao segurar a penalidade", nomes: ["As setas desviam a penalidade", "Carimbo “Provido”", "O Agravião aparece"], dur: 1.3, ancora: "jogador" },
  chifre: { quando: "ao quebrar a coluna", nomes: ["O raio do chifre até a coluna", "O raio em arco-íris", "O Súmulicórnio aparece"], dur: 0.9, ancora: "jogador" },
  penhora: { quando: "em cada moeda penhorada", nomes: ["A garra agarra cada moeda", "Carimbo “Penhorado”", "O Falcão Falimentar aparece"], dur: 0.9, ancora: "moeda" },
  praga: { quando: "ao ativar", nomes: ["A nuvem de gafanhotos traz as moedas", "Folhas roídas caindo", "O Gafanhoto de Mora aparece"], dur: 1.9, ancora: "jogador" },
};
