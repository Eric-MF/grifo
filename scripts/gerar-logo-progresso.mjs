// Gera public/img/logo-grifo-em-progresso.svg: a disposição da logo da OAB (".examples/Logo OAB.svg"), com o círculo da
// bandeira do Brasil (".examples/Flag_of_Brazil.svg"). Uso: node scripts/gerar-logo-progresso.mjs public/img/logo-grifo-em-progresso.svg
import { writeFileSync } from "node:fs";

const f = (n) => +n.toFixed(2);
const NAVY = "#03112c";

// ---------- letras (desenho das letras da faixa da bandeira; I, F, N e T no mesmo traço) ----------
// cada letra: [largura, path com a base em y=0, centrada em x=0, altura 70]
const L = {
  G: [63, "M0 0a31.5 35 0 0 0 0-70 31.5 35 0 0 0 0 70m0-13a18.5 22 0 0 0 0-44 18.5 22 0 0 0 0 44z", "G"],
  R: [63, "m-31.5 0h13v-26h28a22 22 0 0 0 0-44h-40zm13-39h27a9 9 0 0 0 0-18h-27z", "R"],
  O: [63, "m0 0a31.5 35 0 0 0 0-70 31.5 35 0 0 0 0 70m0-13a18.5 22 0 0 0 0-44 18.5 22 0 0 0 0 44", null],
  E: [63, "m-31.5 0h63v-13h-51v-18h40v-12h-40v-14h48v-13h-60z", null],
  M: [63, "m-31.5 0h12v-48l14 48h11l14-48v48h12v-70h-17.5l-14 48-14-48h-17.5z", null],
  P: [63, "m-31.5 0h13v-26h28a22 22 0 0 0 0-44h-40zm13-39h27a9 9 0 0 0 0-18h-27z", null],
  S: [63, "M-15.75-22c0 7 6.75 10.5 16.75 10.5s14.74-3.25 14.75-7.75c0-14.25-46.75-5.25-46.5-30.25 0.25-21.5 24.75-20.5 33.75-20.5s26 4 25.75 21.25h-15.25c0-7.5-7-10.25-15-10.25-7.75 0-13.25 1.25-13.25 8.5-0.25 11.75 46.25 4 46.25 28.75 0 18.25-18 21.75-31.5 21.75-11.5 0-31.55-4.5-31.5-22z", null],
  I: [13, "M-6.5 0h13v-70h-13z", null],
  F: [60, "m-30 0h13v-31h38v-12h-38v-14h47v-13h-60z", null],
  N: [63, "m-31.5 0h12.5v-48.5l27 48.5h23.5v-70h-12.5v48.5l-27-48.5h-23.5z", null],
  T: [63, "m-31.5-70h63v13h-25v57h-13v-57h-25z", null],
  ".": [13, "m-6.5 0h13v-13h-13z", null],
};
// O G da bandeira é o O com o recorte e a barra
const G_BANDEIRA = `<g id="lG"><clipPath id="cortaG"><path d="m-31.5 0v-70h63v70zm31.5-47v12h31.5v-12z"/></clipPath><path clip-path="url(#cortaG)" d="${L.O[1]}" fill-rule="evenodd" vector-effect="non-scaling-stroke"/><path d="M5-35H31.5V-25H5z" vector-effect="non-scaling-stroke"/><path d="m21.5-35h10v35h-10z" vector-effect="non-scaling-stroke"/></g>`;
// P é o R sem a perna; R ganha a perna da bandeira
// R: o corpo do P e a perna em traçados separados (num só, com evenodd, a sobreposição viraria um vão)
const PERNA_R = "m28 0c0-10 0-32-15-32h-19c22 0 22 22 22 32z";
const defsLetras =
  G_BANDEIRA +
  `<g id="lR"><path d="${L.P[1]}" fill-rule="evenodd" vector-effect="non-scaling-stroke"/><path d="${PERNA_R}" vector-effect="non-scaling-stroke"/></g>` +
  Object.entries(L)
    .filter(([k]) => k !== "G" && k !== "R")
    .map(([k, [, d]]) => `<path id="l${k === "." ? "Ponto" : k}" d="${d}" fill-rule="evenodd" vector-effect="non-scaling-stroke"/>`)
    .join("");
const ref = (c) => `#l${c === "." ? "Ponto" : c}`;

// ---------- círculo da bandeira (coordenadas da bandeira: raio 735, centro na origem) ----------
// a faixa: arco de raio 1785 a 1680 com centro em (-420, 1470); as letras ficam no raio 1697.5, como na bandeira
const FAIXA_C = [-420, 1470];
const R_LETRAS = 1697.5;
function letrasNaFaixa(texto) {
  // graus: 3° por letra larga, como na bandeira; o espaço do I e do F é acertado a olho (o F é vazio embaixo à direita)
  const largura = (c) => (c === " " ? 0 : (({ F: 52, I: 25 }[c] ?? L[c][0]) / 63) * 3);
  const itens = [];
  let a = 0;
  let prev = null;
  for (const c of texto) {
    if (c === " ") {
      a += 1.75;
      continue;
    }
    if (prev) a += (largura(prev) + largura(c)) / 2;
    itens.push([c, a]);
    prev = c;
  }
  const meio = 15.75; // o centro do "ORDEM E PROGRESSO" na bandeira
  const desloc = meio - a / 2;
  return itens.map(([c, ang]) => `<use href="${ref(c)}" transform="rotate(${f(ang + desloc)})" y="-${R_LETRAS}"/>`).join("");
}

// estrelas da bandeira (posição e tamanho)
const ESTRELAS = [
  [-600, -132, 31.5], [-535, 177, 31.5], [-625, 243, 26.25], [-463, 132, 15], [-382, 250, 26.25], [-404, 323, 21],
  [228, -228, 31.5], [515, 258, 31.5], [617, 265, 21], [545, 323, 26.25], [368, 477, 26.25], [367, 551, 21],
  [441, 419, 21], [500, 382, 26.25], [365, 405, 21], [-280, 30, 26.25], [200, -37, 21], [0, 330, 31.5],
  [85, 184, 26.25], [0, 118, 26.25], [-74, 184, 21], [-37, 235, 15], [220, 495, 26.25], [283, 430, 21],
  [162, 412, 21], [-295, 390, 31.5], [0, 575, 10.5],
];
const estrela = `<g id="estrela"><g id="ponta"><path id="meiaPonta" transform="rotate(18,0,-1)" d="m0-1v1h0.5"/><use href="#meiaPonta" transform="scale(-1,1)"/></g><use href="#ponta" transform="rotate(72)"/><use href="#ponta" transform="rotate(-72)"/><use href="#ponta" transform="rotate(144)"/><use href="#ponta" transform="rotate(216)"/></g>`;

// ---------- G e N no lugar do A e do B ----------
// Como o A e o B da OAB, as letras são cheias: o desenho sai de recortes estreitos em cunha, não de vãos abertos.
const TOPO = 0;
const BASE = 365;
// GN numa peça só (ligadura): o arco do G vira a diagonal do N, que desce até o pé da haste direita. A diagonal é
// tangente aos dois círculos do G (a 45°), e a barra do G encosta nela. O traço é grosso, para a letra ficar cheia
// como o A e o B da OAB. As contas são feitas num quadro de 490 × 337 e levadas ao espaço da logo.
const GN = (() => {
  const k = BASE / 337;
  const X = (x) => f(370 + (x - 367) * k);
  const Y = (y) => f((y - 321) * k);
  const P = ([x, y]) => `${X(x)} ${Y(y)}`;
  const t = 88; // espessura do traço
  const C = [535, 489.5];
  const R = 168.5;
  const r = R - t;
  const c45 = Math.SQRT1_2;
  const tExt = [C[0] + R * c45, C[1] - R * c45]; // onde o arco de fora vira a borda de cima da diagonal
  const tInt = [C[0] + r * c45, C[1] - r * c45]; // e o de dentro, a de baixo
  const hasteEsq = 857 - t;
  const topoHaste = [hasteEsq, tExt[1] + (hasteEsq - tExt[0])];
  const peDiagonal = [tInt[0] + (658 - tInt[1]), 658];
  const corda = Math.sqrt(R * R - r * r) * c45;
  const encontro = [tInt[0] + corda, tInt[1] + corda]; // o arco de fora encontra a borda de baixo da diagonal
  const barraTopo = 466;
  const barraBase = barraTopo + 72;
  const barraEsq = 505;
  const dentro = (y) => [C[0] + Math.sqrt(r * r - (y - C[1]) ** 2), y];
  const contorno = `M${P(tExt)}L${P(topoHaste)}L${P([hasteEsq, 321])}L${P([857, 321])}L${P([857, 658])}L${P(peDiagonal)}L${P(encontro)}A${f(R * k)} ${f(R * k)} 0 1 1 ${P(tExt)}Z`;
  // o vão do G: o círculo de dentro sem a barra
  const vao = `M${P([barraEsq, barraTopo])}L${P(dentro(barraTopo))}A${f(r * k)} ${f(r * k)} 0 1 0 ${P(dentro(barraBase))}L${P([barraEsq, barraBase])}Z`;
  return contorno + vao;
})();

// a divisa entre a parte de cima e o painel de baixo: uma curva só, que sobe para a direita pelas duas letras
const CURVA = "M355 250C560 248 742 232 912 176"; // passa logo abaixo da barra do G
const ABAIXO = `${CURVA}V400H355Z`;

function letraOuro(id, d) {
  // o painel de baixo é a letra recuada: a borda (na silhueta e no vão do G) mostra o degradê de cima, que escurece aos
  // poucos até a curva
  return `<clipPath id="c${id}"><path d="${d}" clip-rule="evenodd"/></clipPath>
  <path d="${d}" fill-rule="evenodd" fill="url(#ouroAlto)"/>
  <g clip-path="url(#c${id})"><g clip-path="url(#abaixo)">
    <rect x="355" y="150" width="560" height="220" fill="url(#ouroBaixo)"/>
    <path d="${d}" fill="none" stroke="url(#ouroAlto)" stroke-width="13"/>
    <path d="${CURVA}" fill="none" stroke="url(#ouroAlto)" stroke-width="6.5"/>
  </g></g>`;
}

// ---------- GRIFO.NET embaixo, no lugar de NACIONAL: condensada, traço único e cantos levemente arredondados ----------
const T = 12; // espessura do traço
const H = 62; // altura das letras
const W = 34; // largura das letras
const m = T / 2;
const q = 9; // raio dos cantos (no eixo do traço)
const CARACTERES = {
  G: [W, `M${W - m} ${m + 12}V${m + q}Q${W - m} ${m} ${W - m - q} ${m}H${m + q}Q${m} ${m} ${m} ${m + q}V${H - m - q}Q${m} ${H - m} ${m + q} ${H - m}H${W - m - q}Q${W - m} ${H - m} ${W - m} ${H - m - q}V${H / 2 + 2}H${W / 2 + 1}`],
  R: [W, `M${m} ${H}V${m}H${W - m - q}Q${W - m} ${m} ${W - m} ${m + q}V${H / 2 - q - 1}Q${W - m} ${H / 2 - 1} ${W - m - q} ${H / 2 - 1}H${m}M${W - m} ${H / 2 + 4}V${H}`],
  I: [T, `M${m} 0V${H}`],
  F: [W - 3, `M${m} ${H}V${m}H${W - 3}M${m} ${H / 2 - 1}H${W - 7}`],
  O: [W, `M${m + q} ${m}H${W - m - q}Q${W - m} ${m} ${W - m} ${m + q}V${H - m - q}Q${W - m} ${H - m} ${W - m - q} ${H - m}H${m + q}Q${m} ${H - m} ${m} ${H - m - q}V${m + q}Q${m} ${m} ${m + q} ${m}Z`],
  ".": [T, `M0 ${H - T}h${T}v${T}h-${T}z`, true],
  N: [W, `M0 ${H}V0h${T}v${H}zM${W - T} ${H}V0h${T}v${H}zM0 0h${T + 0.4}L${W} ${H - 1}V${H}h-${T + 0.4}L0 1z`, true],
  E: [W - 3, `M${W - 3} ${m}H${m}V${H - m}H${W - 3}M${m} ${H / 2}H${W - 7}`],
  T: [W, `M0 ${m}H${W}M${W / 2} ${m}V${H}`],
};
function textoEmbaixo(texto, cx, base, espaco) {
  const total = [...texto].reduce((s, c) => s + CARACTERES[c][0], 0) + espaco * (texto.length - 1);
  let x = cx - total / 2;
  return [...texto]
    .map((c) => {
      const [w, d, cheio] = CARACTERES[c];
      const el = cheio ? `<path d="${d}" stroke="none"/>` : `<path d="${d}" fill="none"/>`;
      const g = `<g transform="translate(${f(x)} ${base - H})">${el}</g>`;
      x += w + espaco;
      return g;
    })
    .join("");
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 472" width="900" height="472" role="img" aria-labelledby="titulo">
<title id="titulo">Grifo em Progresso · grifo.net</title>
<defs>
  ${defsLetras}
  ${estrela}
  <radialGradient id="azul" gradientUnits="userSpaceOnUse" cx="-230" cy="-40" r="1080" fx="-280" fy="-60">
    <stop offset="0" stop-color="#7cb8e6"/>
    <stop offset="0.35" stop-color="#2f78b5"/>
    <stop offset="0.62" stop-color="#1a6099"/>
    <stop offset="0.9" stop-color="#0a2a52"/>
    <stop offset="1" stop-color="${NAVY}"/>
  </radialGradient>
  <!-- dourado do site: claro no alto, escurecendo aos poucos até a curva; o painel de baixo volta a clarear -->
  <linearGradient id="ouroAlto" gradientUnits="userSpaceOnUse" x1="0" y1="${BASE}" x2="0" y2="${TOPO}">
    <stop offset="0" stop-color="#7d5013"/>
    <stop offset="0.3" stop-color="#94621d"/>
    <stop offset="0.62" stop-color="#c28b3a"/>
    <stop offset="1" stop-color="#ecc47e"/>
  </linearGradient>
  <linearGradient id="ouroBaixo" gradientUnits="userSpaceOnUse" x1="0" y1="165" x2="0" y2="${BASE}">
    <stop offset="0" stop-color="#b47c2c"/>
    <stop offset="0.45" stop-color="#cf9846"/>
    <stop offset="1" stop-color="#efc27a"/>
  </linearGradient>
  <clipPath id="abaixo"><path d="${ABAIXO}"/></clipPath>
  <clipPath id="disco"><circle r="735"/></clipPath>
</defs>
<g transform="translate(180 182.5) scale(${f(180 / 735)})">
  <circle r="735" fill="url(#azul)"/>
  <path d="M-2205 1470a1785 1785 0 0 1 3570 0h-105a1680 1680 0 1 0-3360 0z" clip-path="url(#disco)" fill="#fff"/>
  <g transform="translate(${FAIXA_C[0]} ${FAIXA_C[1]})" fill="${NAVY}" clip-path="url(#discoFaixa)">${letrasNaFaixa("GRIFO EM PROGRESSO")}</g>
  <g fill="#fff">${ESTRELAS.map(([x, y, s]) => `<use href="#estrela" transform="translate(${x} ${y}) scale(${s})"/>`).join("")}</g>
</g>
${letraOuro("GN", GN)}
<g fill="${NAVY}" stroke="${NAVY}" stroke-width="${T}" stroke-linejoin="miter">${textoEmbaixo("GRIFO.NET", 450, 467, 9)}</g>
</svg>
`.replace(' clip-path="url(#discoFaixa)"', "");

writeFileSync(process.argv[2], svg);
console.log("ok", svg.length);
