(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[5249],{31183:(e,a,o)=>{"use strict";o.d(a,{K_:()=>n,QS:()=>t,s_:()=>s});var i=o(4168),r=o(46081);function t(e){return{grifos:(0,r.My)(e).map(e=>({i:e.i,disp:e.disp,exato:e.exato,prefixo:e.prefixo,sufixo:e.sufixo,cor:e.cor,...e.nota?{nota:e.nota}:{},...e.inteiro?{inteiro:!0}:{},...e.grupo?{grupo:e.grupo}:{}})),errados:[...(0,i.le)((0,i.sK)((0,i.QE)().filter(a=>a.d===e),{janelaDias:null}),"baixo")].map(e=>({artigo:e.artigo,erros:e.erros,tentativas:e.erros+e.acertos,...e.nivel?{nivel:e.nivel}:{}}))}}function n(e){let a=e.itens.map(e=>{let a=t(e.lei),o={...e,grifos:a.grifos,errados:a.errados};return"erros"===e.filtro&&(o.artigos=a.errados.map(e=>e.artigo).join(", ")),o});return{...e,itens:a}}function s(e,a,o){return e.titulo===a&&e.itens.length===o.length&&e.itens.every((e,a)=>e.lei===o[a].lei&&(e.filtro??"tudo")===(o[a].filtro??"tudo")&&(e.artigos??"")===(o[a].artigos??""))}},96971:(e,a,o)=>{Promise.resolve().then(o.bind(o,98860))},98860:(e,a,o)=>{"use strict";o.d(a,{LerVademecum:()=>b});var i=o(95155),r=o(98500),t=o.n(r),n=o(12115),s=o(5205),l=o(91264);let d={papel:{bg:"#fbf7ee",fg:"#1f1b16"},branco:{bg:"#ffffff",fg:"#111111"},sepia:{bg:"#f1e3c6",fg:"#3b2c18"},verde:{bg:"#e6f0e1",fg:"#1d2a1a"},escuro:{bg:"#17181b",fg:"#e8e6e1"}},c={sans:'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',serif:'Georgia, "Times New Roman", serif',mono:"ui-monospace, Menlo, Consolas, monospace"},m=["redacao","incluido","revogado","renumerado","vigencia","outro"];var u=o(28053),p=o(31183),g=o(29744),h=o(67175),f=o.n(h);function b(){let[e,a]=(0,n.useState)(null),[o,r]=(0,n.useState)(!1),[h,b]=(0,n.useState)(null),[v,x]=(0,n.useState)({});(0,n.useEffect)(()=>{let e=()=>{let e=location.hash.match(/^#v=(v1\..+)$/);if(!e)return a("invalido");(0,u.KK)(e[1]).then(e=>{if(a(e&&Array.isArray(e.d)?e:"invalido"),e){let a=(0,g.b4)().find(a=>(0,p.s_)(a,e.t,e.d));if(a){let e=(0,p.K_)(a);(0,g.b2)((0,g.b4)().map(o=>o.id===a.id?e:o)),b(e)}else b(null);r(!!a)}})};return e(),window.addEventListener("hashchange",e),()=>window.removeEventListener("hashchange",e)},[]);let j=(0,n.useMemo)(()=>e&&"invalido"!==e?h?h.itens:e.d:[],[e,h]),k=(0,n.useMemo)(()=>j.map(e=>({lei:e.lei,artigos:e.artigos,filtro:e.filtro,grifos:e.grifos,errados:e.errados})),[j]);if(null===e)return(0,i.jsx)("p",{className:"muted",children:"Abrindo o Vade Mecum…"});if("invalido"===e)return(0,i.jsxs)("p",{children:["Este link de Vade Mecum n\xe3o p\xf4de ser lido. ",(0,i.jsx)(t(),{href:"/vademecum/",children:"Monte um novo"}),"."]});let y=(0,g.lV)(e.o),w={...y,impressao:{...y.impressao,...v.impressao},download:{...y.download,...v.download}};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsxs)("div",{className:`${f().acoes} ${f().naoImprimir}`,children:[!o&&(0,i.jsx)("button",{type:"button",className:"btn",onClick:()=>{let a={id:Date.now().toString(36),titulo:e.t,itens:e.d,em:Date.now(),opcoes:y};(0,g.tj)(a),b((0,p.K_)(a)),r(!0)},children:"Salvar no meu Grifo"}),(0,i.jsx)(t(),{className:"btn",href:"/vademecum/",children:"Meus Vade Mecum"})]}),(0,i.jsxs)("div",{className:`${f().saidas} ${f().naoImprimir}`,children:[(0,i.jsxs)("section",{className:f().saida,"aria-labelledby":"saida-impressao",children:[(0,i.jsx)("h2",{id:"saida-impressao",children:"Imprimir / PDF"}),(0,i.jsxs)("label",{className:f().opcaoSaida,children:[(0,i.jsx)("input",{type:"checkbox",checked:w.impressao.colunas,onChange:e=>x(a=>({...a,impressao:{...a.impressao,colunas:e.target.checked}}))}),(0,i.jsxs)("span",{children:[(0,i.jsx)("strong",{children:"Tr\xeas colunas"}),(0,i.jsx)("small",{children:"S\xf3 no papel: economiza folhas e segue o formato dos Vade Mecum impressos."})]})]}),(0,i.jsxs)("label",{className:f().opcaoSaida,children:[(0,i.jsx)("input",{type:"checkbox",checked:w.impressao.novaPaginaPorLei,onChange:e=>x(a=>({...a,impressao:{...a.impressao,novaPaginaPorLei:e.target.checked}}))}),(0,i.jsxs)("span",{children:[(0,i.jsx)("strong",{children:"Cada lei em p\xe1gina nova"}),(0,i.jsx)("small",{children:"S\xf3 no papel, para separar as leis ao encadernar."})]})]}),(0,i.jsx)("p",{className:f().nota,children:"O papel n\xe3o tem como seguir link: os “Grifo” e “Planalto” n\xe3o saem na impress\xe3o."}),(0,i.jsx)("button",{type:"button",className:"btn btn-gold",onClick:()=>window.print(),children:"Imprimir / salvar em PDF"})]}),(0,i.jsxs)("section",{className:f().saida,"aria-labelledby":"saida-baixar",children:[(0,i.jsx)("h2",{id:"saida-baixar",children:"Baixar arquivo"}),(0,i.jsxs)("label",{className:f().opcaoSaida,children:[(0,i.jsx)("input",{type:"checkbox",checked:w.download.links,onChange:e=>x(a=>({...a,download:{...a.download,links:e.target.checked}}))}),(0,i.jsxs)("span",{children:[(0,i.jsx)("strong",{children:"Manter os links “Grifo” e “Planalto”"}),(0,i.jsx)("small",{children:"No arquivo, eles continuam clic\xe1veis e abrem o artigo na lei."})]})]}),(0,i.jsx)("p",{className:f().nota,children:"Um arquivo HTML que abre no navegador, sem precisar do site."}),(0,i.jsx)("button",{type:"button",className:"btn",onClick:()=>{let a,o,i=document.querySelector("[data-vademecum-corpo]");if(!i)return;let r={...w,impressao:{colunas:!1,novaPaginaPorLei:!1}},t=function({titulo:e,corpo:a,opcoes:o}){let i=d[o.texto.fundo],r=l.c9[o.texto.corTexto].cor??i.fg,t=`
:root { --bg: ${i.bg}; --fg: ${r}; --muted: color-mix(in srgb, ${r} 62%, ${i.bg}); --borda: color-mix(in srgb, ${r} 18%, ${i.bg}); --fonte: ${c[o.texto.fonte]}; --tamanho: ${o.texto.tamanho}px; --entrelinha: ${o.texto.entrelinha}; }
* { box-sizing: border-box; }
html { background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--fonte); }
[data-vademecum-corpo] { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; font-size: var(--tamanho); line-height: var(--entrelinha); }
[data-vademecum-corpo] h1 { font-size: 1.9em; margin: 0 0 1rem; }
[data-vademecum-corpo] > section, [data-role="lei"] { margin-top: 2.2rem; }
[data-role="lei"] > h2 { font-size: 1.35em; border-bottom: 1px solid var(--borda); padding-bottom: 0.3rem; }
[data-role="lei"] p, [data-role="lei"] h3, [data-role="lei"] h4 { margin: 0 0 0.7em; }
[data-role="lei"] h3 { font-size: 1em; font-weight: 700; margin-top: 1.4em; }
[data-role="lei"] h4 { font-size: 0.95em; font-style: italic; margin-top: 1em; }
[data-tipo] { color: var(--muted); }
[data-tipo] { font-size: 0.72em; margin-left: 0.35em; }
[data-vide="0"] [data-tipo="vide"] { display: none; }
[data-chip] { font-size: 0.72em; color: var(--muted); border: 1px solid var(--borda); border-radius: 999px; padding: 0.05em 0.55em; text-decoration: none; margin-left: 0.35em; }
[data-link-visual] { margin-left: 0.5em; }
[data-role="indice-cronologico"] ol { list-style: none; padding: 0; }
[data-role="indice-cronologico"] li { margin: 0.25em 0; }
[data-role^="indice"] h2 { font-size: 1.15em; }
[data-role="indice-remissivo"] dl { margin: 0; font-size: 0.92em; }
[data-role="indice-remissivo"] dt { font-weight: 700; margin-top: 0.7em; }
[data-role="indice-remissivo"] dd { margin: 0 0 0 1em; }
[data-indice-data] { font-variant-numeric: tabular-nums; color: var(--muted); margin-right: 0.4em; }
mark { background: var(--c, #fde047); color: inherit; padding: 0 0.12em; border-radius: 0.2em; }
mark[data-so-nota="1"] { background: none; border-bottom: 2px dotted currentColor; border-radius: 0; }
a { color: inherit; }
[data-colunas="3"] [data-role="lei"] > div:first-of-type, [data-colunas="3"] [data-role="indice-remissivo"] dl { columns: 3; column-gap: 1.4rem; }
[data-nova-pagina="1"] [data-role="lei"] { break-before: page; }
@media print {
  body, html { background: #fff; color: #000; }
  [data-vademecum-corpo] { padding: 0; max-width: none; }
  [data-link-visual] { display: none !important; }
}
@page { margin: 16mm; }`;return`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}</title>
<style>${t}
</style>
</head>
<body>
${a}
</body>
</html>
`}({titulo:e.t,corpo:((a=i.cloneNode(!0)).setAttribute("data-colunas","1"),a.setAttribute("data-nova-pagina","0"),r.download.links||a.querySelectorAll("[data-link-visual]").forEach(e=>e.remove()),r.texto.vide||a.querySelectorAll('[data-tipo="vide"]').forEach(e=>e.remove()),r.texto.anotacoes||a.querySelectorAll("[data-tipo]").forEach(e=>{m.includes(e.getAttribute("data-tipo")??"")&&e.remove()}),a.outerHTML),opcoes:r}),n=URL.createObjectURL(new Blob([t],{type:"text/html;charset=utf-8"})),s=document.createElement("a");s.href=n,o=e.t.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""),s.download=`${o||"vade-mecum"}.html`,s.click(),URL.revokeObjectURL(n)},children:"Baixar .html"})]})]}),(0,i.jsx)(s.g,{secoes:k,titulo:e.t,opcoes:w})]})}}},e=>{e.O(0,[6414,8892,8500,7056,2149,8265,9700,8441,3794,7358],()=>e(e.s=96971)),_N_E=e.O()}]);